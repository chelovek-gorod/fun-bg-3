const canvas = document.createElement('canvas')
const context = canvas.getContext("2d")
document.body.append(canvas)

canvas.style.display = 'block'
canvas.style.position = 'absolute'
canvas.style.top = '0'
canvas.style.left = '0'
canvas.style.width = '100vw'
canvas.style.height = '100vh'
canvas.style.backgroundColor = '#1c242b'

////////////////////////////////////

const COLOR = 0x00fe90
const MIN_SIZE = 8
const MAX_SIZE = 18
const MIN_ALPHA = 0.25
const MAX_ALPHA = 1.0
const ALPHA_STEPS = 1000

const MIN_SPEED = 0.01
const MAX_SPEED = 0.03
const ALPHA_MIN_SPEED = 0.0003
const ALPHA_MAX_SPEED = 0.0006

const DENSITY_FACTOR = 6000

const ACTION_RADIUS_RATE = 0.4 // 0...1
const CURSOR_GRAVITY = 0.0002

const MAX_GRAVITY_SPEED = 0.16 // Максимальная скорость при гравитации
const MAX_GRAVITY_SPEED_SQUARED = MAX_GRAVITY_SPEED * MAX_GRAVITY_SPEED
const FRICTION = 0.98 // Сопротивление для стабилизации

const OUT_X = -10000
const OUT_Y = -5000

let cursorPoint = { x: OUT_X, y: OUT_Y }

let cachedActionRadius = 0
let cachedMinSide = 0

const bgColor = [28, 36, 43]
const fgColor = [0, 254, 144]

const ALPHA_RANGE = MAX_ALPHA - MIN_ALPHA
const ALPHA_STEP = ALPHA_RANGE / (ALPHA_STEPS - 1)
const INV_ALPHA_STEP = 1 / ALPHA_STEP

const colorPalette = new Array(ALPHA_STEPS)

for (let i = 0; i < ALPHA_STEPS; i++) {
    const alpha = MIN_ALPHA + i * ALPHA_STEP
    const invAlpha = 1 - alpha
    
    const r = Math.round(bgColor[0] * invAlpha + fgColor[0] * alpha)
    const g = Math.round(bgColor[1] * invAlpha + fgColor[1] * alpha)
    const b = Math.round(bgColor[2] * invAlpha + fgColor[2] * alpha)
    
    colorPalette[i] = `rgb(${r},${g},${b})`
}

function getColorByAlpha(alpha) {
    const normalizedAlpha = Math.max(MIN_ALPHA, Math.min(MAX_ALPHA, alpha))
    const index = Math.round((normalizedAlpha - MIN_ALPHA) * INV_ALPHA_STEP)
    return colorPalette[index]
}

function getActionRadius() {
    const minSide = Math.min(canvas.width, canvas.height)
    if (minSide !== cachedMinSide) {
        cachedMinSide = minSide
        cachedActionRadius = minSide * ACTION_RADIUS_RATE
    }
    return cachedActionRadius
}

function updateCursorPosition(x, y) {
    cursorPoint.x = x
    cursorPoint.y = y
}

canvas.addEventListener('mousemove', (e) => {
    updateCursorPosition(e.clientX, e.clientY)
})
canvas.addEventListener('mouseleave', () => updateCursorPosition(OUT_X, OUT_Y))

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    updateCursorPosition(touch.clientX, touch.clientY)
})
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    updateCursorPosition(touch.clientX, touch.clientY)
})
canvas.addEventListener('touchend', (e) => {
    e.preventDefault()
    updateCursorPosition(OUT_X, OUT_Y)
})
canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault()
    updateCursorPosition(OUT_X, OUT_Y)
})
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    updateCursorPosition(touch.clientX, touch.clientY)
})

// Оптимизация для группировки по цвету
const colorBuckets = new Array(ALPHA_STEPS)

function initColorBuckets() {
    for (let i = 0; i < ALPHA_STEPS; i++) {
        colorBuckets[i] = []
    }
}

class Square {
    constructor(canvasWidth, canvasHeight) {
        this.x = Math.random() * (canvasWidth - MAX_SIZE)
        this.y = Math.random() * (canvasHeight - MAX_SIZE)
        this.size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE)
        this.alpha = MIN_ALPHA + Math.random() * (MAX_ALPHA - MIN_ALPHA)
        
        const angle = Math.random() * Math.PI * 2
        const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)
        this.speedX = Math.cos(angle) * speed
        this.speedY = Math.sin(angle) * speed
        
        this.alphaSpeed = (Math.random() > 0.5 ? 1 : -1) * 
                         (ALPHA_MIN_SPEED + Math.random() * (ALPHA_MAX_SPEED - ALPHA_MIN_SPEED))
        
        this.originalSpeedX = this.speedX
        this.originalSpeedY = this.speedY
        
        // Расчет констант
        this.originalSpeedSquared = this.originalSpeedX * this.originalSpeedX + this.originalSpeedY * this.originalSpeedY
        
        // Инициализация индекса цвета
        this.colorIndex = Math.round((this.alpha - MIN_ALPHA) * INV_ALPHA_STEP)
        this.colorIndex = Math.max(0, Math.min(ALPHA_STEPS - 1, this.colorIndex))
    }
    
    update(deltaTime) {
        const dx = cursorPoint.x - this.x
        const dy = cursorPoint.y - this.y
        const distanceSquared = dx * dx + dy * dy
        const actionRadius = getActionRadius()
        const actionRadiusSquared = actionRadius * actionRadius
        
        if (distanceSquared < actionRadiusSquared && distanceSquared > 0) {
            const distance = Math.sqrt(distanceSquared)
            const normX = dx / distance
            const normY = dy / distance
            
            const force = (1 - distance / actionRadius) * CURSOR_GRAVITY * deltaTime
            
            this.speedX += normX * force
            this.speedY += normY * force
            
            // Ограничение скорости
            const currentSpeedSquared = this.speedX * this.speedX + this.speedY * this.speedY
            if (currentSpeedSquared > MAX_GRAVITY_SPEED_SQUARED) {
                const scale = MAX_GRAVITY_SPEED / Math.sqrt(currentSpeedSquared)
                this.speedX *= scale
                this.speedY *= scale
            }
        } else {
            this.speedX = this.speedX * FRICTION + (this.originalSpeedX - this.speedX) * 0.02
            this.speedY = this.speedY * FRICTION + (this.originalSpeedY - this.speedY) * 0.02
        }
        
        this.x += this.speedX * deltaTime
        this.y += this.speedY * deltaTime
        
        // Оптимизированные проверки границ
        if (this.x < -this.size) this.x = canvas.width
        else if (this.x > canvas.width) this.x = -this.size
        if (this.y < -this.size) this.y = canvas.height
        else if (this.y > canvas.height) this.y = -this.size
        
        // Сохраняем старую альфу для проверки изменений
        const oldAlpha = this.alpha
        this.alpha += this.alphaSpeed * deltaTime
        
        if (this.alpha <= MIN_ALPHA) {
            this.alpha = MIN_ALPHA
            this.alphaSpeed = Math.abs(this.alphaSpeed)
        } else if (this.alpha >= MAX_ALPHA) {
            this.alpha = MAX_ALPHA
            this.alphaSpeed = -Math.abs(this.alphaSpeed)
        }
        
        // Обновляем цвет если альфа изменилась
        if (this.alpha !== oldAlpha) {
            const newColorIndex = Math.round((this.alpha - MIN_ALPHA) * INV_ALPHA_STEP)
            const clampedIndex = Math.max(0, Math.min(ALPHA_STEPS - 1, newColorIndex))
            
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
    
    const area = canvas.width * canvas.height
    const squaresCount = Math.floor(area / DENSITY_FACTOR)
    
    for (let i = 0; i < squaresCount; i++) {
        const square = new Square(canvas.width, canvas.height)
        squares.push(square)
        colorBuckets[square.colorIndex].push(square)
    }
    console.log(`Created ${squaresCount} squares for area ${area}`)
}

function drawSquares() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    
    // Оптимизированная отрисовка по цветам
    for (let i = 0; i < ALPHA_STEPS; i++) {
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
