package com.toolboxapp

import android.app.Activity
import android.content.pm.ActivityInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.MediaRecorder
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.view.WindowManager
import android.app.WallpaperManager
import java.io.File
import java.io.FileOutputStream
import kotlin.math.atan2
import kotlin.math.sqrt
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class ToolboxNativeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

  private var sensorManager: SensorManager? = null
  private var magSensor: Sensor? = null
  private var accSensor: Sensor? = null
  private var mode = "" // "" | "mag" | "acc" | "compass"
  private var accVals = FloatArray(3)
  private var magVals = FloatArray(3)
  private var recorder: MediaRecorder? = null
  private var noiseFile: File? = null

  override fun getName() = "ToolboxNative"

  private fun emit(name: String, params: com.facebook.react.bridge.WritableMap) {
    try {
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit(name, params)
    } catch (e: Exception) {
      // JS 侧未就绪时忽略
    }
  }

  private fun ui(block: (Activity) -> Unit) {
    val activity = reactContext.getCurrentActivity() ?: return
    activity.runOnUiThread {
      try {
        block(activity)
      } catch (_: Exception) {
      }
    }
  }

  // ---------- 屏幕控制 ----------

  @ReactMethod
  fun setKeepScreenOn(on: Boolean) {
    ui { activity ->
      if (on) {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      } else {
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      }
    }
  }

  @ReactMethod
  fun setOrientation(mode: String) {
    ui { activity ->
      activity.requestedOrientation = when (mode) {
        "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        "portrait" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
        else -> ActivityInfo.SCREEN_ORIENTATION_FULL_USER
      }
    }
  }

  /** 沉浸式：隐藏状态栏 + 导航栏 */
  @ReactMethod
  fun setImmersive(on: Boolean) {
    ui { activity ->
      val decor = activity.window.decorView
      if (on) {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        @Suppress("DEPRECATION")
        decor.systemUiVisibility =
            (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION)
      } else {
        @Suppress("DEPRECATION")
        decor.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      }
    }
  }

  // ---------- 传感器 ----------

  private fun ensureSensors() {
    if (sensorManager == null) {
      sensorManager = reactContext.getSystemService(Activity.SENSOR_SERVICE) as? SensorManager
      magSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
      accSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    }
  }

  @ReactMethod
  fun startMagnetometer(intervalMs: Int) {
    try {
      ensureSensors()
      mode = "mag"
      val s = magSensor
      if (s == null) {
        val p = Arguments.createMap(); p.putString("error", "no-sensor")
        emit("MagnetometerUpdate", p)
        return
      }
      sensorManager?.registerListener(this, s, (intervalMs * 1000).coerceAtLeast(10000))
    } catch (e: Exception) {
      val p = Arguments.createMap(); p.putString("error", e.message ?: "unknown")
      emit("MagnetometerUpdate", p)
    }
  }

  @ReactMethod
  fun startAccelerometer(intervalMs: Int) {
    try {
      ensureSensors()
      mode = "acc"
      val s = accSensor
      if (s == null) {
        val p = Arguments.createMap(); p.putString("error", "no-sensor")
        emit("AccelerometerUpdate", p)
        return
      }
      sensorManager?.registerListener(this, s, (intervalMs * 1000).coerceAtLeast(10000))
    } catch (e: Exception) {
      val p = Arguments.createMap(); p.putString("error", e.message ?: "unknown")
      emit("AccelerometerUpdate", p)
    }
  }

  /** 指南针：加速度计 + 磁力计融合解算航向 */
  @ReactMethod
  fun startCompass(intervalMs: Int) {
    try {
      ensureSensors()
      mode = "compass"
      val m = magSensor
      val a = accSensor
      if (m == null || a == null) {
        val p = Arguments.createMap(); p.putString("error", "no-sensor")
        emit("CompassUpdate", p)
        return
      }
      sensorManager?.registerListener(this, m, (intervalMs * 1000).coerceAtLeast(10000))
      sensorManager?.registerListener(this, a, (intervalMs * 1000).coerceAtLeast(10000))
    } catch (e: Exception) {
      val p = Arguments.createMap(); p.putString("error", e.message ?: "unknown")
      emit("CompassUpdate", p)
    }
  }

  @ReactMethod
  fun stopSensors() {
    try {
      sensorManager?.unregisterListener(this)
      mode = ""
    } catch (_: Exception) {
    }
  }

  override fun onSensorChanged(event: SensorEvent?) {
    event ?: return
    try {
      when (event.sensor.type) {
        Sensor.TYPE_ACCELEROMETER -> {
          accVals = event.values.clone()
          if (mode == "acc") {
            val p = Arguments.createMap()
            p.putDouble("x", event.values[0].toDouble())
            p.putDouble("y", event.values[1].toDouble())
            p.putDouble("z", event.values[2].toDouble())
            emit("AccelerometerUpdate", p)
          } else if (mode == "compass") {
            emitCompass()
          }
        }
        Sensor.TYPE_MAGNETIC_FIELD -> {
          magVals = event.values.clone()
          if (mode == "mag") {
            val m = sqrt(
                event.values[0] * event.values[0] +
                    event.values[1] * event.values[1] +
                    event.values[2] * event.values[2])
            val p = Arguments.createMap()
            p.putDouble("x", event.values[0].toDouble())
            p.putDouble("y", event.values[1].toDouble())
            p.putDouble("z", event.values[2].toDouble())
            p.putDouble("magnitude", m.toDouble())
            emit("MagnetometerUpdate", p)
          } else if (mode == "compass") {
            emitCompass()
          }
        }
      }
    } catch (_: Exception) {
    }
  }

  private fun emitCompass() {
    val r = FloatArray(9)
    val i = FloatArray(9)
    val ok = SensorManager.getRotationMatrix(r, i, accVals, magVals)
    if (!ok) return
    val o = FloatArray(3)
    SensorManager.getOrientation(r, o)
    var heading = Math.toDegrees(o[0].toDouble())
    if (heading < 0) heading += 360.0
    val p = Arguments.createMap()
    p.putDouble("heading", heading)
    p.putDouble("pitch", Math.toDegrees(o[1].toDouble()))
    p.putDouble("roll", Math.toDegrees(o[2].toDouble()))
    emit("CompassUpdate", p)
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  // ---------- 振动 ----------

  private fun vibrator(): Vibrator? {
    return try {
      if (Build.VERSION.SDK_INT >= 31) {
        val vm = reactContext.getSystemService(android.content.Context.VIBRATOR_MANAGER_SERVICE)
            as? VibratorManager
        vm?.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        reactContext.getSystemService(Activity.VIBRATOR_SERVICE) as? Vibrator
      }
    } catch (e: Exception) {
      null
    }
  }

  /** pattern: 毫秒节奏逗号分隔，如 "0,80,60,80"（等待,震,等待,震...） */
  @ReactMethod
  fun vibrate(pattern: String) {
    try {
      val v = vibrator() ?: return
      val seq = pattern.split(",").mapNotNull { it.trim().toLongOrNull() }
      if (seq.isEmpty()) return
      if (Build.VERSION.SDK_INT >= 26) {
        v.vibrate(VibrationEffect.createWaveform(seq.toLongArray(), -1))
      } else {
        @Suppress("DEPRECATION")
        v.vibrate(seq.toLongArray(), -1)
      }
    } catch (_: Exception) {
    }
  }

  @ReactMethod
  fun cancelVibrate() {
    try {
      vibrator()?.cancel()
    } catch (_: Exception) {
    }
  }

  // ---------- 噪音检测（MediaRecorder 振幅） ----------

  @ReactMethod
  fun startNoise(promise: Promise) {
    try {
      stopNoiseInternal()
      val f = File(reactContext.cacheDir, "noise_probe.3gp")
      noiseFile = f
      val mr = MediaRecorder()
      mr.setAudioSource(MediaRecorder.AudioSource.MIC)
      mr.setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP)
      mr.setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB)
      mr.setOutputFile(f.absolutePath)
      mr.prepare()
      mr.start()
      recorder = mr
      promise.resolve(true)
    } catch (e: Exception) {
      recorder = null
      promise.reject("START_FAIL", e.message ?: "无法启动麦克风", e)
    }
  }

  @ReactMethod
  fun getNoiseAmplitude(promise: Promise) {
    try {
      val r = recorder
      if (r == null) {
        promise.resolve(-1.0)
        return
      }
      promise.resolve(r.maxAmplitude.toDouble()) // 0..32767
    } catch (e: Exception) {
      promise.resolve(-1.0)
    }
  }

  @ReactMethod
  fun stopNoise() {
    stopNoiseInternal()
  }

  private fun stopNoiseInternal() {
    try {
      recorder?.stop()
    } catch (_: Exception) {
    }
    try {
      recorder?.release()
    } catch (_: Exception) {
    }
    recorder = null
    try {
      noiseFile?.delete()
    } catch (_: Exception) {
    }
    noiseFile = null
  }

  // ---------- 当前壁纸 ----------

  @ReactMethod
  fun getWallpaper(promise: Promise) {
    try {
      val wm = WallpaperManager.getInstance(reactContext)
      val d = wm.drawable
      val bmp = (d as? BitmapDrawable)?.bitmap
      if (bmp == null) {
        promise.reject("NO_BITMAP", "无法获取壁纸图像", null)
        return
      }
      val f = File(reactContext.cacheDir, "wallpaper_${System.currentTimeMillis()}.jpg")
      val out = FileOutputStream(f)
      bmp.compress(Bitmap.CompressFormat.JPEG, 92, out)
      out.flush()
      out.close()
      promise.resolve(f.absolutePath)
    } catch (e: Exception) {
      promise.reject("FAIL", e.message ?: "获取壁纸失败", e)
    }
  }

  // ---------- 设备详情 ----------

  @ReactMethod
  fun getDeviceInfo(promise: Promise) {
    try {
      val p = Arguments.createMap()
      p.putString("brand", Build.BRAND)
      p.putString("model", Build.MODEL)
      p.putString("device", Build.DEVICE)
      p.putString("product", Build.PRODUCT)
      p.putString("manufacturer", Build.MANUFACTURER)
      p.putString("board", Build.BOARD)
      p.putString("hardware", Build.HARDWARE)
      p.putString("fingerprint", Build.FINGERPRINT)
      p.putString("release", Build.VERSION.RELEASE)
      p.putInt("sdk", Build.VERSION.SDK_INT)
      p.putString("codename", Build.VERSION.CODENAME)
      p.putString("securityPatch", Build.VERSION.SECURITY_PATCH)
      p.putString("abi", Build.SUPPORTED_ABIS.joinToString(", "))
      promise.resolve(p)
    } catch (e: Exception) {
      promise.reject("FAIL", e.message ?: "获取失败", e)
    }
  }

  override fun invalidate() {
    super.invalidate()
    try {
      sensorManager?.unregisterListener(this)
      stopNoiseInternal()
    } catch (_: Exception) {
    }
  }
}
