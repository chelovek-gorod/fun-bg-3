const canvas = document.createElement('canvas')
const context = canvas.getContext("2d")
document.body.append(canvas)

canvas.style.display = 'block'
canvas.style.position = 'absolute'
canvas.style.top = '0'
canvas.style.left = '0'
canvas.style.width = '100vw'
canvas.style.height = '100vh'
canvas.style.backgroundColor = '#1e2a3c'

////////////////////////////////////

let sizeIndex = -1
const SIZES = []
const SIZES_DATA = {
    0:  1024,
    2:  512,
    4:  256,
    6:  128,
    8:  64,
    10: 32,
    12: 16,
    14: 8,
    16: 4,
    18: 2,
    20: 1
}
for (const [size, count] of Object.entries(SIZES_DATA)) {
    for (let i = 0; i < count; i++) {
        SIZES.push(Number(size))
    }
}
// Эффективное перемешивание Fisher-Yates
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
    return array
}
// Перемешиваем массив
shuffleArray(SIZES)

const MIN_SIZE = 2
const MAX_SIZE = 20
const BRIGHTNESS_STEPS = 1000
const BRIGHTNESS_MIN_SPEED = 0.0002
const BRIGHTNESS_MAX_SPEED = 0.0004
const CHANCE_LOW_BRIGHTNESS = 0.9995

const CEIL_SIZE = MAX_SIZE + 4

const darkColor = [34, 48, 69]; // #223045 - самый тусклый
const brightColor = [74, 222, 128] // #4ade80 - самый яркий

const colorPalette = new Array(BRIGHTNESS_STEPS)

for (let i = 0; i < BRIGHTNESS_STEPS; i++) {
    const brightness = i / (BRIGHTNESS_STEPS - 1) // от 0 до 1
    
    const r = Math.round(darkColor[0] + (brightColor[0] - darkColor[0]) * brightness)
    const g = Math.round(darkColor[1] + (brightColor[1] - darkColor[1]) * brightness)
    const b = Math.round(darkColor[2] + (brightColor[2] - darkColor[2]) * brightness)
    
    colorPalette[i] = `rgb(${r},${g},${b})`
}

function getColorByBrightness(brightness) {
    const normalizedBrightness = Math.max(0, Math.min(1, brightness))
    const index = Math.round(normalizedBrightness * (BRIGHTNESS_STEPS - 1))
    return colorPalette[index]
}

// Оптимизация для группировки по цвету
const colorBuckets = new Array(BRIGHTNESS_STEPS)

function initColorBuckets() {
    for (let i = 0; i < BRIGHTNESS_STEPS; i++) {
        colorBuckets[i] = []
    }
}

function getRandom(min, max) {
    return min + Math.random() * (max - min)
}

class Square {
    constructor(x, y, size) {
        this.size = size
        this.x = x - this.size * 0.5
        this.y = y - this.size * 0.5
        
        if (Math.random() < CHANCE_LOW_BRIGHTNESS) this.brightness = 0
        else this.brightness = Math.random() * Math.random()
        
        // У всех одинаковая базовая скорость
        this.brightnessSpeed = getRandom(BRIGHTNESS_MIN_SPEED, BRIGHTNESS_MAX_SPEED)
        this.brightnessSpeed *= Math.random() > 0.5 ? 1 : -1 
        
        // Инициализация индекса цвета
        this.colorIndex = Math.round(this.brightness * (BRIGHTNESS_STEPS - 1))
        this.colorIndex = Math.max(0, Math.min(BRIGHTNESS_STEPS - 1, this.colorIndex))
    }
    
    update(deltaTime) {
        const oldBrightness = this.brightness

        if (this.brightness <= 0) {
            // Достигли минимума - решаем, начинать ли brighten
            if (Math.random() < CHANCE_LOW_BRIGHTNESS) {
                // Останавливаемся на минимуме
                this.brightness = 0
                this.brightnessSpeed = 0
            } else {
                // Начинаем brighten сразу с новой скоростью
                this.brightnessSpeed = Math.abs(getRandom(BRIGHTNESS_MIN_SPEED, BRIGHTNESS_MAX_SPEED))
                this.brightness += this.brightnessSpeed * deltaTime
            }
        } else if (this.brightness >= 1) {
            // Достигли максимума - сразу начинаем тускнеть
            this.brightness = 1
            this.brightnessSpeed = -Math.abs(getRandom(BRIGHTNESS_MIN_SPEED, BRIGHTNESS_MAX_SPEED))
            this.brightness += this.brightnessSpeed * deltaTime
        } else {
            // Обычное движение
            this.brightness += this.brightnessSpeed * deltaTime
        }
        
        // Обновляем цвет если яркость изменилась
        if (this.brightness !== oldBrightness) {
            const newColorIndex = Math.round(this.brightness * (BRIGHTNESS_STEPS - 1))
            const clampedIndex = Math.max(0, Math.min(BRIGHTNESS_STEPS - 1, newColorIndex))
            
            if (clampedIndex !== this.colorIndex) {
                // Удаляем из старого бакета
                const oldBucket = colorBuckets[this.colorIndex]
                const index = oldBucket.indexOf(this)
                if (index > -1) oldBucket.splice(index, 1)
                
                // Добавляем в новый
                this.colorIndex = clampedIndex
                colorBuckets[this.colorIndex].push(this)
            }
        }
    }
}

let squares = []
let lastTime = 0
let animationId = null
let isAnimating = false

function createSquares() {
    squares = []
    initColorBuckets()
    
    // Создаем сетку с шагом CEIL_SIZE
    const cols = Math.ceil(canvas.width / CEIL_SIZE)
    const rows = Math.ceil(canvas.height / CEIL_SIZE)
    const start = CEIL_SIZE * 0.5
    
    for (let row = 0; row < rows; row++) {
        const y = start + row * CEIL_SIZE
        for (let col = 0; col < cols; col++) {
            sizeIndex++
            if (sizeIndex === SIZES.length) sizeIndex = 0
            const size = SIZES[sizeIndex]
            if (size === 0) continue

            const x = start + col * CEIL_SIZE
            const square = new Square(x, y, size)
            squares.push(square)
            colorBuckets[square.colorIndex].push(square)
        }
    }
}

function drawSquares() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    
    // Оптимизированная отрисовка по цветам
    for (let i = 0; i < BRIGHTNESS_STEPS; i++) {
        const bucket = colorBuckets[i]
        const bucketLength = bucket.length
        
        if (bucketLength === 0) continue
        
        context.fillStyle = colorPalette[i]
        
        for (let j = 0; j < bucketLength; j++) {
            const square = bucket[j]
            context.fillRect(square.x, square.y, square.size, square.size)
        }
    }
}

function animate(currentTime) {
    const deltaTime = currentTime - lastTime
    lastTime = currentTime
    
    for (let i = 0; i < squares.length; i++) {
        squares[i].update(deltaTime)
    }
    
    drawSquares()
    
    if (isAnimating) {
        animationId = requestAnimationFrame(animate)
    }
}

function startAnimation() {
    if (!isAnimating) {
        isAnimating = true
        lastTime = performance.now()
        animationId = requestAnimationFrame(animate)
    }
}

function stopAnimation() {
    isAnimating = false
    if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    stopAnimation()
    createSquares()
    startAnimation()
}

window.addEventListener('focus', startAnimation)
window.addEventListener('blur', stopAnimation)

resizeCanvas()
window.addEventListener('resize', resizeCanvas)