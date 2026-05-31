import { Color } from 'three'

// Helper to create a data URI from a canvas
function createDataUrl(width, height, drawFn) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    drawFn(ctx, width, height)
    return canvas.toDataURL()
}

// Generate Gas Giant Texture (Banded)
export function generateGasGiantTexture(baseColorStr, bands = 5) {
    return createDataUrl(512, 512, (ctx, w, h) => {
        const baseColor = new Color(baseColorStr)

        // Fill background
        ctx.fillStyle = baseColor.getStyle()
        ctx.fillRect(0, 0, w, h)

        // Draw bands
        for (let i = 0; i < bands; i++) {
            const y = Math.random() * h
            const height = Math.random() * (h / bands)
            const opacity = 0.1 + Math.random() * 0.3

            // Darken or lighten
            const modifier = Math.random() > 0.5 ? 1.2 : 0.8
            const bandColor = baseColor.clone().multiplyScalar(modifier)

            ctx.fillStyle = bandColor.getStyle()
            ctx.globalAlpha = opacity
            ctx.fillRect(0, y, w, height)

            // Add some noise/turbulence lines
            ctx.globalAlpha = 0.1
            for (let j = 0; j < 10; j++) {
                const ly = y + Math.random() * height
                ctx.beginPath()
                ctx.moveTo(0, ly)
                ctx.bezierCurveTo(w / 3, ly - 20, 2 * w / 3, ly + 20, w, ly)
                ctx.strokeStyle = '#fff'
                ctx.stroke()
            }
        }
    })
}

// Generate Rocky Texture (Noise/Craters)
export function generateRockyTexture(baseColorStr) {
    return createDataUrl(512, 512, (ctx, w, h) => {
        const baseColor = new Color(baseColorStr)

        ctx.fillStyle = baseColor.getStyle()
        ctx.fillRect(0, 0, w, h)

        // Simple noise
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * w
            const y = Math.random() * h
            const radius = Math.random() * 1.5
            const opacity = Math.random() * 0.2

            ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff'
            ctx.globalAlpha = opacity
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.fill()
        }

        // Craters (larger circles)
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * w
            const y = Math.random() * h
            const radius = 5 + Math.random() * 20

            ctx.strokeStyle = 'rgba(0,0,0,0.3)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.stroke()

            ctx.fillStyle = 'rgba(0,0,0,0.1)'
            ctx.fill()
        }
    })
}
