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
    }
    
    update(deltaTime) {
        // Движение
        this.x += this.speedX * deltaTime
        this.y += this.speedY * deltaTime
        
        // Телепорт при выходе за границы
        if (this.x < -this.size) this.x = canvas.width
        if (this.x > canvas.width) this.x = -this.size
        if (this.y < -this.size) this.y = canvas.height
        if (this.y > canvas.height) this.y = -this.size
        
        // Изменение альфы
        this.alpha += this.alphaSpeed * deltaTime
        
        // Изменение направления альфы при достижении границ
        if (this.alpha <= MIN_ALPHA) {
            this.alpha = MIN_ALPHA
            this.alphaSpeed = Math.abs(this.alphaSpeed)
        } else if (this.alpha >= MAX_ALPHA) {
            this.alpha = MAX_ALPHA
            this.alphaSpeed = -Math.abs(this.alphaSpeed)
        }
    }
    
    draw(ctx) {
        ctx.fillStyle = getColorByAlpha(this.alpha)
        ctx.fillRect(this.x, this.y, this.size, this.size)
    }
}

let squares = []
let lastTime = 0
let animationId = null
let isAnimating = false

function createSquares() {
    squares = []
    
    const area = canvas.width * canvas.height
    const squaresCount = Math.floor(area / DENSITY_FACTOR)
    
    for (let i = 0; i < squaresCount; i++) {
        squares.push(new Square(canvas.width, canvas.height))
    }
    console.log(`Created ${squaresCount} squares for area ${area}`)
}

function drawSquares() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    squares.forEach(square => square.draw(context))
}

function animate(currentTime) {
    const deltaTime = currentTime - lastTime
    lastTime = currentTime
    
    squares.forEach(square => square.update(deltaTime))
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

// Обработчики фокуса окна
window.addEventListener('focus', startAnimation)
window.addEventListener('blur', stopAnimation)

///////////////////////////////////

resizeCanvas()
window.addEventListener('resize', resizeCanvas)
