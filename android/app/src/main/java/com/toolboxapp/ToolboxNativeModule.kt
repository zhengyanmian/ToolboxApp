package com.toolboxapp

import android.app.Activity
import android.content.pm.ActivityInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class ToolboxNativeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

  private var sensorManager: SensorManager? = null
  private var magnetometer: Sensor? = null

  override fun getName() = "ToolboxNative"

  @ReactMethod
  fun setKeepScreenOn(on: Boolean) {
    val activity = reactContext.getCurrentActivity() ?: return
    activity.runOnUiThread {
      if (on) {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      } else {
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      }
    }
  }

  @ReactMethod
  fun setOrientation(mode: String) {
    val activity = reactContext.getCurrentActivity() ?: return
    activity.runOnUiThread {
      activity.requestedOrientation = when (mode) {
        "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        "portrait" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
        else -> ActivityInfo.SCREEN_ORIENTATION_FULL_USER
      }
    }
  }

  @ReactMethod
  fun startMagnetometer(intervalMs: Int) {
    if (sensorManager == null) {
      sensorManager =
          reactContext.getSystemService(Activity.SENSOR_SERVICE) as? SensorManager
      magnetometer = sensorManager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
    }
    val sensor = magnetometer
    if (sensor == null) {
      val params = Arguments.createMap()
      params.putString("error", "no-sensor")
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("MagnetometerUpdate", params)
      return
    }
    sensorManager?.registerListener(this, sensor, (intervalMs * 1000).coerceAtLeast(10000))
  }

  @ReactMethod
  fun stopMagnetometer() {
    sensorManager?.unregisterListener(this)
  }

  override fun onSensorChanged(event: SensorEvent?) {
    event ?: return
    val params = Arguments.createMap()
    params.putDouble("x", event.values[0].toDouble())
    params.putDouble("y", event.values[1].toDouble())
    params.putDouble("z", event.values[2].toDouble())
    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("MagnetometerUpdate", params)
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  override fun invalidate() {
    super.invalidate()
    sensorManager?.unregisterListener(this)
  }
}
