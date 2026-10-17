package com.toolboxapp

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Environment
import android.os.StrictMode
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.MediaStore
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

  // ---------- 剪贴板 / 下载目录 ----------

  @ReactMethod
  fun copyText(text: String) {
    ui { activity ->
      val cm = activity.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
      cm?.setPrimaryClip(ClipData.newPlainText("toolbox", text))
    }
  }

  /** 把应用缓存/私有目录里的文件复制到系统「下载」目录，返回可读路径 */
  @ReactMethod
  fun saveToDownloads(srcPath: String, displayName: String, mime: String, promise: Promise) {
    try {
      val src = File(srcPath)
      if (!src.exists()) {
        promise.reject("NO_FILE", "源文件不存在")
        return
      }
      if (Build.VERSION.SDK_INT >= 29) {
        val values = ContentValues()
        values.put(MediaStore.Downloads.DISPLAY_NAME, displayName)
        values.put(MediaStore.Downloads.MIME_TYPE, mime)
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        values.put(MediaStore.Downloads.IS_PENDING, 1)
        val resolver = reactContext.contentResolver
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw Exception("系统拒绝创建下载文件")
        resolver.openOutputStream(uri)?.use { out ->
          src.inputStream().use { ins -> ins.copyTo(out) }
        }
        values.clear()
        values.put(MediaStore.Downloads.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
        promise.resolve("${Environment.DIRECTORY_DOWNLOADS}/$displayName")
      } else {
        val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!dir.exists()) dir.mkdirs()
        val dst = File(dir, displayName)
        src.inputStream().use { ins -> FileOutputStream(dst).use { ins.copyTo(it) } }
        promise.resolve("${Environment.DIRECTORY_DOWNLOADS}/$displayName")
      }
    } catch (e: Exception) {
      promise.reject("SAVE_FAIL", e.message ?: "保存失败", e)
    }
  }

  // ---------- 外部应用打开 / 文件管理器跳转 ----------

  private fun downloadDir(): File =
      Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)

  /** 按文件名在「下载」集合里查 Uri（Android 10+ 应用自建的文件可直接读，无需存储权限） */
  private fun queryDownloadsUri(name: String): Uri? {
    if (name.isEmpty() || Build.VERSION.SDK_INT < 29) return null
    var cur: android.database.Cursor? = null
    try {
      cur = reactContext.contentResolver.query(
          MediaStore.Downloads.EXTERNAL_CONTENT_URI,
          arrayOf(MediaStore.Downloads._ID),
          "${MediaStore.Downloads.DISPLAY_NAME} = ?",
          arrayOf(name),
          null)
      if (cur != null && cur.moveToFirst()) {
        val id = cur.getLong(0)
        return ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id)
      }
    } catch (e: Exception) {
      return null
    } finally {
      try {
        cur?.close()
      } catch (_: Exception) {
      }
    }
    return null
  }

  /**
   * 把传进来的路径解析成真实文件。
   * 兼容绝对路径与 saveToDownloads 返回的「Download/xxx.mp3」相对路径。
   */
  private fun resolveFile(path: String): File? {
    val raw = path.trim()
    if (raw.isEmpty() || raw.startsWith("content://")) return null
    val direct = File(raw)
    if (direct.isAbsolute && direct.exists()) return direct
    val name = raw.substringAfterLast('/')
    if (name.isEmpty()) return null
    val inDownload = File(downloadDir(), name)
    if (inDownload.exists()) return inDownload
    return null
  }

  /** 依次尝试的 Uri：先 MediaStore（避免 FileUriExposed），再 file:// */
  private fun candidateUris(path: String): List<Uri> {
    val raw = path.trim()
    val out = mutableListOf<Uri>()
    if (raw.isEmpty()) return out
    if (raw.startsWith("content://")) {
      out.add(Uri.parse(raw))
      return out
    }
    val name = raw.substringAfterLast('/')
    if (name.isNotEmpty()) queryDownloadsUri(name)?.let { out.add(it) }
    resolveFile(raw)?.let { out.add(Uri.fromFile(it)) }
    return out
  }

  private fun viewFlags(): Int =
      Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK

  /**
   * 最后兜底：老系统（API 24-28）没有 MediaStore.Downloads，工程里也没有声明 FileProvider，
   * 只能直连 file://。这里临时放宽 VmPolicy，避免 targetSdk≥24 时抛 FileUriExposedException 崩溃。
   */
  private fun startLegacy(uri: Uri, type: String, chooser: Boolean): Boolean {
    val old = StrictMode.getVmPolicy()
    return try {
      StrictMode.setVmPolicy(StrictMode.VmPolicy.LAX)
      val view = Intent(Intent.ACTION_VIEW)
      view.setDataAndType(uri, type)
      view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      val target = if (chooser) Intent.createChooser(view, "选择应用打开") else view
      target.addFlags(viewFlags())
      reactContext.startActivity(target)
      true
    } catch (e: Exception) {
      false
    } finally {
      try {
        StrictMode.setVmPolicy(old)
      } catch (_: Exception) {
      }
    }
  }

  /** 用系统里已安装的应用打开单个文件 */
  @ReactMethod
  fun openFile(path: String, mime: String, promise: Promise) {
    if (path.trim().isEmpty()) {
      promise.reject("E_OPEN", "文件路径为空")
      return
    }
    val type = if (mime.trim().isEmpty()) "*/*" else mime.trim()
    val name = path.trim().substringAfterLast('/')
    val uris = candidateUris(path)
    if (uris.isEmpty()) {
      promise.reject("E_OPEN", "找不到该文件，可能已被移动或删除")
      return
    }
    var lastErr: Exception? = null
    for (u in uris) {
      try {
        val intent = Intent(Intent.ACTION_VIEW)
        intent.setDataAndType(u, type)
        intent.addFlags(viewFlags())
        reactContext.startActivity(intent)
        promise.resolve("已用外部应用打开：$name")
        return
      } catch (e: Exception) {
        // ActivityNotFound / FileUriExposedException / SecurityException 都走下一个候选
        lastErr = e
      }
    }
    val legacy = resolveFile(path)
    if (legacy != null && startLegacy(Uri.fromFile(legacy), type, false)) {
      promise.resolve("已用外部应用打开：$name")
      return
    }
    promise.reject("E_OPEN", "没有可以打开该文件的应用", lastErr)
  }

  /** 跳到文件所在目录，逐个候选降级，全部失败才报错 */
  @ReactMethod
  fun openFolder(path: String, promise: Promise) {
    var dir = downloadDir()
    try {
      val raw = path.trim()
      if (raw.isNotEmpty()) {
        val f = File(raw)
        val base = if (f.isAbsolute) f else File(downloadDir(), f.name)
        dir = if (base.isDirectory) base else (base.parentFile ?: downloadDir())
      }
    } catch (e: Exception) {
      dir = downloadDir()
    }

    val rootUri = Uri.parse("content://com.android.externalstorage.documents/root/primary")
    val candidates = mutableListOf<Intent>()

    // a. 按「目录」协议交给文件管理器（MT 管理器 / ES / 部分 ROM 的系统文件）
    candidates.add(Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(Uri.fromFile(dir), "resource/folder")
    })
    // b. 系统「下载」列表（最贴近用户想看的目录）
    candidates.add(Intent("android.intent.action.VIEW_DOWNLOADS"))
    // c. DocumentsUI 指名打开内部存储根
    candidates.add(Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(rootUri, "resource/folder")
      setPackage("com.android.documentsui")
    })
    candidates.add(Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(rootUri, "resource/folder")
    })
    // d. 文件管理器首页 / 任意选文件的入口
    candidates.add(Intent(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_APP_FILES) })
    candidates.add(Intent(Intent.ACTION_GET_CONTENT).apply {
      type = "*/*"
      addCategory(Intent.CATEGORY_OPENABLE)
    })

    var lastErr: Exception? = null
    for (intent in candidates) {
      try {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
        promise.resolve("已打开文件管理器，请进入：${dir.absolutePath}")
        return
      } catch (e: Exception) {
        lastErr = e
      }
    }
    promise.reject("E_FOLDER", "此设备没有可用的文件管理器", lastErr)
  }

  /** 弹出系统「选择应用打开」选择器 */
  @ReactMethod
  fun listOpenWith(path: String, mime: String, promise: Promise) {
    if (path.trim().isEmpty()) {
      promise.reject("E_OPEN", "文件路径为空")
      return
    }
    val type = if (mime.trim().isEmpty()) "*/*" else mime.trim()
    val uris = candidateUris(path)
    if (uris.isEmpty()) {
      promise.reject("E_OPEN", "找不到该文件，可能已被移动或删除")
      return
    }
    var lastErr: Exception? = null
    for (u in uris) {
      try {
        val view = Intent(Intent.ACTION_VIEW)
        view.setDataAndType(u, type)
        view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        val chooser = Intent.createChooser(view, "选择应用打开")
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(chooser)
        promise.resolve("请在系统面板中选择要使用的应用")
        return
      } catch (e: Exception) {
        lastErr = e
      }
    }
    val legacy = resolveFile(path)
    if (legacy != null && startLegacy(Uri.fromFile(legacy), type, true)) {
      promise.resolve("请在系统面板中选择要使用的应用")
      return
    }
    promise.reject("E_OPEN", "没有可以打开该文件的应用", lastErr)
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
