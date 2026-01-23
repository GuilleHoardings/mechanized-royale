/**
 * CombatSystem - Handles all combat mechanics for Mechanized Royale
 * Extracted from BattleScene to improve code organization
 */

class CombatSystem {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Checks if a tank should engage in combat
     * @param {Object} tank - Tank object to check
     */
    checkTankCombat(tank) {
        const currentTime = this.scene.time.now;

        // Skip if stunned
        if (tank.stunnedUntil && currentTime < tank.stunnedUntil) return;
        if (!tank.target || tank.moving) return;

        const timeSinceLastShot = currentTime - tank.lastShotTime;
        const rateOfFire = 2000; // 2 seconds between shots

        if (timeSinceLastShot >= rateOfFire) {
            // Face the target before shooting
            const angle = GameHelpers.angle(tank.x, tank.y, tank.target.x, tank.target.y);
            tank.setRotation(angle);

            this.tankShoot(tank, tank.target);
            tank.lastShotTime = currentTime;
        }
    }

    /**
     * Checks if a base/tower should engage in combat
     * @param {Object} base - Base object to check
     */
    checkBaseCombat(base) {
        const currentTime = this.scene.time.now;

        // Skip if stunned or shooting disabled
        if (base.stunnedUntil && currentTime < base.stunnedUntil) return;
        if (base.canShoot === false) return;
        if (!base.target) return;

        const timeSinceLastShot = currentTime - base.lastShotTime;
        const baseRateOfFire = 1500; // Bases fire faster than tanks

        if (timeSinceLastShot >= baseRateOfFire) {
            this.baseShoot(base, base.target);
            base.lastShotTime = currentTime;
        }
    }

    /**
     * Makes a tank shoot at a target
     * @param {Object} attacker - Tank doing the shooting
     * @param {Object} target - Target being shot at
     */
    tankShoot(attacker, target) {
        this.createProjectile(attacker, target);
    }

    /**
     * Makes a base/tower shoot at a target
     * @param {Object} base - Base doing the shooting
     * @param {Object} target - Target being shot at
     */
    baseShoot(base, target) {
        // Animate turret rotation before firing
        if (base.turret) {
            const angle = GameHelpers.angle(base.x, base.y, target.x, target.y);

            // Animate the turret rotation
            this.scene.tweens.add({
                targets: base.turret,
                rotation: angle,
                duration: 150,
                ease: 'Power2',
                onComplete: () => {
                    this.createBaseProjectile(base, target);
                }
            });
        } else {
            // No turret - just shoot immediately
            this.createBaseProjectile(base, target);
        }
    }

    /**
     * Creates a projectile from tank to target
     * @param {Object} attacker - Tank firing the projectile
     * @param {Object} target - Target of the projectile
     */
    createProjectile(attacker, target) {
        // Determine projectile type based on tank type
        let bulletTexture = 'bullet';
        let bulletSpeed = 250; // pixels per second - slower for visibility
        let bulletColor = 0xffff00;

        if (attacker.unitData.unitType === TANK_TYPES.HEAVY) {
            bulletTexture = 'shell';
            bulletSpeed = 200;
            bulletColor = 0xff8800;
        } else if (attacker.unitData.unitType === TANK_TYPES.MEDIUM) {
            bulletSpeed = 225;
            bulletColor = 0xffffff;
        }

        // Create bullet sprite
        const bullet = this.scene.add.image(attacker.x, attacker.y, bulletTexture);
        bullet.setTint(bulletColor);
        bullet.setDepth(1100); // Above battlefield units

        // Calculate angle from attacker to target
        const angle = GameHelpers.angle(attacker.x, attacker.y, target.x, target.y);
        const distance = GameHelpers.distance(attacker.x, attacker.y, target.x, target.y);
        const travelTime = (distance / bulletSpeed) * 1000; // Convert to milliseconds

        // Rotate bullet to face direction of travel
        bullet.setRotation(angle);

        // Store bullet properties
        bullet.damage = attacker.unitData.stats.damage;
        bullet.penetration = attacker.unitData.stats.penetration;
        bullet.attacker = attacker;
        bullet.target = target;
        bullet.speed = bulletSpeed;

        // Track shots fired statistics
        if (attacker.isPlayerTank) {
            this.scene.battleStats.player.shotsFired++;
        } else {
            this.scene.battleStats.ai.shotsFired++;
        }
        this.scene.battleStats.battle.totalProjectilesFired++;

        // Add to projectiles array
        this.scene.projectiles.push(bullet);

        // Show enhanced muzzle flash and projectile trail
        this.showMuzzleFlash(attacker, target.x, target.y);

        // Animate bullet movement
        this.scene.tweens.add({
            targets: bullet,
            x: target.x,
            y: target.y,
            duration: travelTime,
            ease: 'None',
            onComplete: () => {
                this.onBulletHit(bullet);
            }
        });
    }

    /**
     * Creates a projectile from base to target
     * @param {Object} base - Base firing the projectile
     * @param {Object} target - Target of the projectile
     */
    createBaseProjectile(base, target) {
        // Base projectiles are more powerful
        const bulletSpeed = 300; // Faster than tank bullets
        const bulletColor = base.isPlayerOwned ? 0x0088ff : 0xff0088; // Blue for player, magenta for enemy

        // Create bullet sprite
        const bullet = this.scene.add.image(base.x, base.y, 'shell');
        bullet.setTint(bulletColor);
        bullet.setScale(1.2); // Larger bullets
        bullet.setDepth(1100); // Above battlefield units

        // Create bullet trail
        const trail = this.scene.add.graphics();
        trail.lineStyle(3, bulletColor, 0.8);
        trail.setDepth(1099); // Slightly below bullet but above tanks
        bullet.trail = trail;

        // Calculate angle from base to target
        const angle = GameHelpers.angle(base.x, base.y, target.x, target.y);
        const distance = GameHelpers.distance(base.x, base.y, target.x, target.y);
        const travelTime = (distance / bulletSpeed) * 1000;

        // Rotate bullet to face direction of travel
        bullet.setRotation(angle);

        // Store bullet properties - bases are more powerful
        bullet.damage = 80; // Higher damage than tanks
        bullet.penetration = 100; // High penetration
        bullet.attacker = base;
        bullet.target = target;
        bullet.speed = bulletSpeed;
        bullet.isBaseProjectile = true; // Mark as base projectile

        // Add to projectiles array
        this.scene.projectiles.push(bullet);

        // Show enhanced muzzle flash for base
        this.showMuzzleFlash(base, target.x, target.y);

        // Track shots fired statistics for base/tower
        if (base.isPlayerOwned) {
            this.scene.battleStats.player.shotsFired++;
        } else {
            this.scene.battleStats.ai.shotsFired++;
        }
        this.scene.battleStats.battle.totalProjectilesFired++;

        // Animate bullet movement
        this.scene.tweens.add({
            targets: bullet,
            x: target.x,
            y: target.y,
            duration: travelTime,
            ease: 'None',
            onUpdate: () => {
                // Update trail
                if (bullet.trail) {
                    bullet.trail.clear();
                    bullet.trail.lineStyle(3, bulletColor, 0.8);
                    bullet.trail.lineBetween(base.x, base.y, bullet.x, bullet.y);
                }
            },
            onComplete: () => {
                this.onBulletHit(bullet);
            }
        });
    }

    /**
     * Handles what happens when a bullet hits its target
     * @param {Object} bullet - The bullet that hit
     */
    onBulletHit(bullet) {
        // Remove bullet from projectiles array
        const index = this.scene.projectiles.indexOf(bullet);
        if (index > -1) {
            this.scene.projectiles.splice(index, 1);
        }

        // Check if target still exists and has health
        if (bullet.target && bullet.target.health > 0) {
            // Calculate damage with armor penetration
            const damage = this.calculateDamage(bullet);

            // Apply damage
            this.applyDamage(bullet.target, damage, bullet.attacker);

            // Update statistics
            this.updateCombatStatistics(bullet, damage);

            // Update health display
            this.updateHealthDisplay(bullet.target);

            // Check if target is destroyed
            if (bullet.target.health <= 0) {
                this.handleTargetDestruction(bullet.target, bullet.attacker);
            } else {
                // Target still alive - show hit effect
                const isCritical = damage.penetrationRatio >= 0.8;
                const isArmored = damage.penetrationRatio < 0.5;

                this.showHitEffect(bullet.target.x, bullet.target.y, isArmored);
                this.showDamageNumber(bullet.target.x, bullet.target.y, damage.finalDamage, isCritical);
            }
        }

        // Destroy bullet sprite
        bullet.destroy();

        // Destroy trail
        if (bullet.trail) {
            bullet.trail.destroy();
        }
    }

    /**
     * Calculates damage with armor penetration mechanics
     * @param {Object} bullet - The bullet object
     * @returns {Object} Damage calculation result
     */
    calculateDamage(bullet) {
        const baseDamage = bullet.damage;
        const penetration = bullet.penetration || baseDamage; // Fallback for old bullets
        const targetArmorData = bullet.target.unitData?.stats?.armor;
        const targetArmor = targetArmorData ?
            (typeof targetArmorData === 'object' ? targetArmorData.front : targetArmorData) : 0;

        // Penetration formula: if penetration >= armor, full damage
        // Otherwise, reduced damage based on armor effectiveness
        let finalDamage;
        let penetrationRatio = 1.0; // Default to full penetration

        if (penetration >= targetArmor) {
            finalDamage = baseDamage;
            penetrationRatio = 1.0;
        } else {
            // Armor reduces damage: damage = base * (penetration / armor)
            penetrationRatio = Math.max(0.1, penetration / targetArmor); // Minimum 10% damage
            finalDamage = Math.floor(baseDamage * penetrationRatio);
        }

        return {
            finalDamage,
            penetrationRatio,
            baseDamage,
            penetration,
            targetArmor
        };
    }

    /**
     * Applies damage to a target
     * @param {Object} target - Target to damage
     * @param {Object} damage - Damage calculation result
     * @param {Object} attacker - Entity that caused the damage
     */
    applyDamage(target, damage, attacker) {
        // Store previous health for destruction check
        const previousHealth = target.health;

        // Activate main towers when they are hit for the first time
        if (target.isMainTower && !target.activated) {
            target.activated = true;
            if (this.scene.onTowerActivated) {
                this.scene.onTowerActivated(target);
            }
            console.log(`Main tower activated! (${target.isPlayerOwned ? 'Player' : 'Enemy'})`);
        }

        // Apply damage
        target.health = Math.max(0, target.health - damage.finalDamage);

        return previousHealth;
    }

    /**
     * Updates combat-related statistics
     * @param {Object} bullet - The bullet object
     * @param {Object} damage - Damage calculation result
     */
    updateCombatStatistics(bullet, damage) {
        if (!bullet.attacker) return;

        // Track shots hit
        // Check both isPlayerTank (tanks) and isPlayerOwned (buildings/towers)
        const isPlayerAttacker = bullet.attacker.isPlayerTank || bullet.attacker.isPlayerOwned;

        if (isPlayerAttacker) {
            this.scene.battleStats.player.shotsHit++;
            this.scene.battleStats.player.totalDamageDealt += damage.finalDamage;
            if (bullet.target.isPlayerTank !== undefined) {
                // Tank target
                if (!bullet.target.isPlayerTank) {
                    // Player hit enemy tank
                    this.scene.battleStats.ai.totalDamageTaken += damage.finalDamage;
                }
            } else {
                // Building target
                this.scene.battleStats.player.buildingDamage += damage.finalDamage;
            }

            // Track critical hits (high penetration)
            if (damage.penetrationRatio >= 0.8) {
                this.scene.battleStats.player.criticalHits++;
            }
        } else {
            this.scene.battleStats.ai.shotsHit++;
            this.scene.battleStats.ai.totalDamageDealt += damage.finalDamage;
            if (bullet.target.isPlayerTank !== undefined) {
                // Tank target
                if (bullet.target.isPlayerTank) {
                    // AI hit player tank
                    this.scene.battleStats.player.totalDamageTaken += damage.finalDamage;
                }
            } else {
                // Building target
                this.scene.battleStats.ai.buildingDamage += damage.finalDamage;
            }

            // Track AI critical hits
            if (damage.penetrationRatio >= 0.8) {
                this.scene.battleStats.ai.criticalHits++;
            }
        }

        // Track total battle damage
        this.scene.battleStats.battle.totalDamageDealt += damage.finalDamage;
    }

    /**
     * Updates health display for a target
     * @param {Object} target - Target whose health display needs updating
     */
    updateHealthDisplay(target) {
        // Safety check - target may have been destroyed
        if (!target || !target.active || !target.healthFill) {
            return;
        }

        if (this.scene.updateTankHealth && target.unitData) {
            this.scene.updateTankHealth(target);
        } else if (this.scene.updateBuildingHealth) {
            this.scene.updateBuildingHealth(target);
        }
    }

    /**
     * Handles target destruction
     * @param {Object} target - Target that was destroyed
     * @param {Object} attacker - Entity that destroyed the target
     */
    handleTargetDestruction(target, attacker) {
        // Check if it's an actual tower, not a V1 Launcher or other building
        if (GameHelpers.isActualTower(target)) {
            // Tower destroyed - handle tower system
            this.scene.destroyTower(target);
        } else if (target.isPlayerOwned !== undefined) {
            // Non-tower building destroyed (e.g., V1 Launcher) - just destroy it visually
            this.scene.destroyBuilding(target);
        } else {
            // Tank destroyed - create destruction effect
            this.showExplosionEffect(target.x, target.y, 1.5);

            // Track tank destruction in statistics
            if (attacker) {
                const isPlayerAttacker = attacker.isPlayerTank || attacker.isPlayerOwned;

                if (isPlayerAttacker) {
                    this.scene.battleStats.player.tanksDestroyed++;
                    this.scene.battleStats.ai.tanksLost++;
                } else {
                    this.scene.battleStats.ai.tanksDestroyed++;
                    this.scene.battleStats.player.tanksLost++;
                }
            }
        }
    }

    /**
     * Shows damage numbers above target
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} damage - Damage amount
     * @param {boolean} isCritical - Whether this is a critical hit
     */
    showDamageNumber(x, y, damage, isCritical = false) {
        const color = isCritical ? '#ffff00' : '#ff4444';
        const fontSize = isCritical ? '20px' : '16px';
        const prefix = isCritical ? 'CRIT ' : '';

        const damageText = this.scene.add.text(x, y, `${prefix}${Math.ceil(damage)}`, {
            fontSize: fontSize,
            fill: color,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        damageText.setDepth(1000);

        // Animate damage number
        this.scene.tweens.add({
            targets: damageText,
            y: y - 40,
            alpha: 0,
            scale: isCritical ? 1.5 : 1.2,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
        });
    }

    /**
     * Shows hit effect at impact location
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {boolean} isArmored - Whether this hit was against armor
     */
    showHitEffect(x, y, isArmored = false) {
        // Create hit spark effect
        const particles = this.scene.add.graphics();
        particles.setDepth(999);

        const sparkColor = isArmored ? 0xffffff : 0xff8800;
        const sparkCount = isArmored ? 4 : 3; // Reduced from 8/5

        for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2;
            const speed = GameHelpers.randomInt(10, 25); // Reduced from 20-40
            const sparkX = x + Math.cos(angle) * 3; // Reduced from 5
            const sparkY = y + Math.sin(angle) * 3;

            particles.fillStyle(sparkColor);
            particles.fillCircle(sparkX, sparkY, 2);

            // Animate sparks
            this.scene.tweens.add({
                targets: { x: sparkX, y: sparkY },
                x: sparkX + Math.cos(angle) * speed,
                y: sparkY + Math.sin(angle) * speed,
                duration: 200, // Reduced from 300
                ease: 'Power2',
                onUpdate: (tween) => {
                    const obj = tween.targets[0];
                    particles.clear();
                    particles.fillStyle(sparkColor, 1 - tween.progress);
                    particles.fillCircle(obj.x, obj.y, 1.5); // Slightly smaller
                }
            });
        }

        // Remove particles after animation
        this.scene.time.delayedCall(200, () => particles.destroy());

        // Play hit sound
        if (this.scene.playUISound) {
            this.scene.playUISound('hit');
        }
    }

    /**
     * Shows explosion effect
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} size - Size multiplier for explosion
     */
    showExplosionEffect(x, y, size = 1) {
        // Create explosion graphics
        const explosion = this.scene.add.graphics();
        explosion.setDepth(998);

        // Reduced rings from 4 to 2 for less noise
        const rings = [
            { radius: 15 * size, color: 0xffff00, alpha: 0.8 },
            { radius: 30 * size, color: 0xff8800, alpha: 0.6 }
        ];

        rings.forEach((ring, index) => {
            explosion.fillStyle(ring.color, ring.alpha);
            explosion.fillCircle(x, y, ring.radius);

            this.scene.tweens.add({
                targets: ring,
                radius: ring.radius * 1.5,
                alpha: 0,
                duration: 400 + (index * 100), // Reduced duration
                ease: 'Power2',
                onUpdate: () => {
                    explosion.clear();
                    rings.forEach(r => {
                        explosion.fillStyle(r.color, r.alpha);
                        explosion.fillCircle(x, y, r.radius);
                    });
                }
            });
        });

        // Debris particles - reduced from 12 to 6
        for (let i = 0; i < 6; i++) {
            const debris = this.scene.add.graphics();
            debris.fillStyle(0x444444);
            debris.fillRect(x - 1, y - 1, 2, 2); // Smaller debris
            debris.setDepth(997);

            const angle = (i / 6) * Math.PI * 2;
            const speed = GameHelpers.randomInt(20, 40);
            const gravity = 100;

            this.scene.tweens.add({
                targets: debris,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed + gravity,
                rotation: Math.PI * 2,
                alpha: 0,
                duration: 500, // Faster
                ease: 'Power2',
                onComplete: () => debris.destroy()
            });
        }

        // Remove explosion graphics after animation
        this.scene.time.delayedCall(600, () => explosion.destroy());

        // Play explosion sound
        if (this.scene.playUISound) {
            this.scene.playUISound('explosion');
        }
    }

    /**
     * Shows muzzle flash effect
     * @param {Object} tank - Tank or base firing
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     */
    showMuzzleFlash(tank, targetX, targetY) {
        // Calculate barrel end position
        const angle = tank.rotation;
        const barrelLength = 25; // Approximate barrel length
        const flashX = tank.x + Math.cos(angle) * barrelLength;
        const flashY = tank.y + Math.sin(angle) * barrelLength;

        // Create muzzle flash
        const flash = this.scene.add.graphics();
        flash.setDepth(996);

        // Draw smaller muzzle flash
        flash.fillStyle(0xffff99, 0.7);
        flash.fillCircle(flashX, flashY, 5); // Reduced from 8

        flash.fillStyle(0xffaa00, 0.5);
        flash.fillCircle(flashX, flashY, 8); // Reduced from 12

        // Quick flash animation
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: 100,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });

        // Create projectile trail
        this.createProjectileTrail(flashX, flashY, targetX, targetY);

        // Play shoot sound
        if (this.scene.playUISound) {
            this.scene.playUISound('shoot');
        }
    }

    /**
     * Creates projectile trail effect
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} endX - End X coordinate
     * @param {number} endY - End Y coordinate
     */
    createProjectileTrail(startX, startY, endX, endY) {
        const trail = this.scene.add.graphics();
        trail.setDepth(995);

        // Draw projectile line
        trail.lineStyle(2, 0xffff00, 0.8);
        trail.lineBetween(startX, startY, endX, endY);

        // Fade out trail quickly
        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 100, // Faster
            ease: 'Power2',
            onComplete: () => trail.destroy()
        });
    }

    /**
     * Creates old-style muzzle flash (backwards compatibility)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} angle - Angle of fire
     */
    createMuzzleFlash(x, y, angle) {
        // Create muzzle flash at barrel tip
        const flashOffset = 25; // Distance from tank center to barrel tip
        const flashX = x + Math.cos(angle) * flashOffset;
        const flashY = y + Math.sin(angle) * flashOffset;

        const flash = this.scene.add.graphics();
        flash.fillStyle(0xffff88, 0.8);
        flash.fillCircle(flashX, flashY, 8);

        // Quick flash animation
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 100,
            onComplete: () => flash.destroy()
        });
    }
}
