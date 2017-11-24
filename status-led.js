const five = require("johnny-five")

class StatusLed {
    constructor(opts) {
        this.led = new five.Led.RGB(opts)

        this.prepare = function() {
            this.led.stop()
            this.led.on()
        }
    }

    updating() {
        this.prepare()
        this.led.color("blue")
        this.led.blink(50)
    }

    waiting() {
        this.prepare()
        this.led.color("green")
    }
    
    error() {
        this.prepare()
        this.led.color("red")
        this.led.blink(500)
    }

    off() {
        return this.led.off()
    }

    intensity(value) {
        return this.led.intensity(value)
    }
}

module.exports = StatusLed
