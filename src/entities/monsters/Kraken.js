import { BaseMonster } from './BaseMonster.js';
import { CONFIG } from '../../main.js';

// ============================================
// KRAKEN - The Original Monster
// Standard balanced behavior
// ============================================

export class Kraken extends BaseMonster {
    constructor(x, y, map) {
        super(x, y, map);
        
        this.name = 'Kraken';
        this.description = 'The original threat';
    }
    
    // Kraken uses all default BaseMonster behavior
    // No special mechanics - just solid, balanced gameplay
    
    // ============================================
    // RENDERING - Classic tentacle monster look
    // ============================================
    
    render(ctx) {
        const x = this.x;
        const y = this.y + this.pulseOffset;
        const s = this.size;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, this.y + s / 2 + 3, s / 2 + 2, s / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tentacles
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.tentaclePhase;
            const tentacleX = x + Math.cos(angle) * (s / 2);
            const tentacleY = y + s / 3;
            const endX = tentacleX + Math.cos(angle + Math.sin(this.tentaclePhase + i)) * 15;
            const endY = tentacleY + 10 + Math.sin(this.tentaclePhase * 2 + i) * 5;
            
            ctx.beginPath();
            ctx.moveTo(tentacleX, tentacleY);
            ctx.quadraticCurveTo(
                tentacleX + (endX - tentacleX) / 2,
                tentacleY + 15,
                endX,
                endY
            );
            ctx.stroke();
        }
        
        // Body (blob shape)
        ctx.fillStyle = '#c0392b';
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2 + 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner glow
        const gradient = ctx.createRadialGradient(x, y - 5, 0, x, y, s / 2);
        gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
        gradient.addColorStop(1, 'rgba(139, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, s / 2, s / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x, y - 3, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupil
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x, y - 3 + this.eyeOffset.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x + this.eyeOffset.x - 2, y - 5 + this.eyeOffset.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
