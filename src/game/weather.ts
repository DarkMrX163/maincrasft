import * as THREE from 'three';
import { sounds } from './audio';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'thunderstorm';

export interface WeatherVisuals {
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  sunIntensity: number;
  ambientIntensity: number;
  ambientColor: THREE.Color;
}

export class WeatherSystem {
  public currentWeather: WeatherType = 'clear';
  public targetWeather: WeatherType = 'clear';
  private weatherTimer: number = 0;
  private weatherDuration: number = 180; // changes every 3 minutes if auto
  public autoCycle: boolean = true;

  // Particle systems
  public rainPoints: THREE.Points | null = null;
  public snowPoints: THREE.Points | null = null;
  private rainGeometry: THREE.BufferGeometry | null = null;
  private snowGeometry: THREE.BufferGeometry | null = null;

  // Rain splash / lightning
  private lightningTimer: number = 0;
  public isLightningFlash: boolean = false;
  private flashDuration: number = 0;

  // Particle counts
  private readonly RAIN_COUNT = 2400;
  private readonly SNOW_COUNT = 1800;
  private readonly VOLUME_RADIUS = 30;
  private readonly VOLUME_HEIGHT = 28;

  constructor(private scene: THREE.Scene) {
    this.initRain();
    this.initSnow();
  }

  private createSoftParticleTexture(isSnow = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    if (isSnow) {
      // Fluffy round snowflake
      const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 14);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(240, 245, 255, 0.8)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Elongated raindrop streak
      ctx.fillStyle = 'rgba(180, 215, 255, 0.85)';
      ctx.fillRect(14, 2, 4, 28);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  private initRain() {
    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.RAIN_COUNT * 3);
    const velocities = new Float32Array(this.RAIN_COUNT);

    for (let i = 0; i < this.RAIN_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * this.VOLUME_RADIUS * 2;
      positions[i * 3 + 1] = Math.random() * this.VOLUME_HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.VOLUME_RADIUS * 2;
      velocities[i] = 26 + Math.random() * 8; // fast falling rain
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

    const rainMat = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.55,
      map: this.createSoftParticleTexture(false),
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.rainPoints = new THREE.Points(this.rainGeometry, rainMat);
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);
  }

  private initSnow() {
    this.snowGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.SNOW_COUNT * 3);
    const velocities = new Float32Array(this.SNOW_COUNT);
    const randomOffsets = new Float32Array(this.SNOW_COUNT);

    for (let i = 0; i < this.SNOW_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * this.VOLUME_RADIUS * 2;
      positions[i * 3 + 1] = Math.random() * this.VOLUME_HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.VOLUME_RADIUS * 2;
      velocities[i] = 3.5 + Math.random() * 2.5; // gentle slow snowflakes
      randomOffsets[i] = Math.random() * Math.PI * 2;
    }

    this.snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.snowGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    this.snowGeometry.setAttribute('offset', new THREE.BufferAttribute(randomOffsets, 1));

    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.65,
      map: this.createSoftParticleTexture(true),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.snowPoints = new THREE.Points(this.snowGeometry, snowMat);
    this.snowPoints.visible = false;
    this.scene.add(this.snowPoints);
  }

  public setWeather(type: WeatherType) {
    if (this.currentWeather === type) return;

    const oldWeather = this.currentWeather;
    this.currentWeather = type;
    this.weatherTimer = 0;

    // Toggle particle system visibility
    if (this.rainPoints) {
      this.rainPoints.visible = type === 'rain' || type === 'thunderstorm';
    }
    if (this.snowPoints) {
      this.snowPoints.visible = type === 'snow';
    }

    // Audio ambient changes
    if (type === 'rain' || type === 'thunderstorm') {
      sounds.startRainAmbient();
    } else {
      if (oldWeather === 'rain' || oldWeather === 'thunderstorm') {
        sounds.stopRainAmbient();
      }
    }
  }

  public update(delta: number, cameraPos: THREE.Vector3, isNightTime: boolean): WeatherVisuals {
    // Weather duration timer
    if (this.autoCycle) {
      this.weatherTimer += delta;
      if (this.weatherTimer > this.weatherDuration) {
        this.weatherTimer = 0;
        // 60% clear, 20% rain, 15% snow, 5% thunderstorm
        const r = Math.random();
        if (r < 0.55) this.setWeather('clear');
        else if (r < 0.75) this.setWeather('rain');
        else if (r < 0.90) this.setWeather('snow');
        else this.setWeather('thunderstorm');
      }
    }

    // Update Rain Particles
    if (this.rainPoints && this.rainPoints.visible && this.rainGeometry) {
      this.rainPoints.position.set(cameraPos.x, cameraPos.y - 10, cameraPos.z);
      const posAttr = this.rainGeometry.attributes.position;
      const velAttr = this.rainGeometry.attributes.velocity;

      for (let i = 0; i < this.RAIN_COUNT; i++) {
        let y = posAttr.getY(i) - velAttr.getX(i) * delta;
        let x = posAttr.getX(i) - 2.5 * delta; // slight wind slant
        let z = posAttr.getZ(i);

        // Wrap around boundary relative to camera
        if (y < 0) {
          y = this.VOLUME_HEIGHT;
          x = (Math.random() - 0.5) * this.VOLUME_RADIUS * 2;
          z = (Math.random() - 0.5) * this.VOLUME_RADIUS * 2;
        }

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // Update Snow Particles
    if (this.snowPoints && this.snowPoints.visible && this.snowGeometry) {
      this.snowPoints.position.set(cameraPos.x, cameraPos.y - 10, cameraPos.z);
      const posAttr = this.snowGeometry.attributes.position;
      const velAttr = this.snowGeometry.attributes.velocity;
      const offAttr = this.snowGeometry.attributes.offset;

      const time = performance.now() * 0.0015;

      for (let i = 0; i < this.SNOW_COUNT; i++) {
        let y = posAttr.getY(i) - velAttr.getX(i) * delta;
        // Swaying drift
        const offset = offAttr.getX(i);
        let x = posAttr.getX(i) + Math.sin(time + offset) * 0.8 * delta;
        let z = posAttr.getZ(i) + Math.cos(time + offset * 1.3) * 0.6 * delta;

        if (y < 0) {
          y = this.VOLUME_HEIGHT;
          x = (Math.random() - 0.5) * this.VOLUME_RADIUS * 2;
          z = (Math.random() - 0.5) * this.VOLUME_RADIUS * 2;
        }

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // Lightning flashes during thunderstorm
    if (this.currentWeather === 'thunderstorm') {
      this.lightningTimer += delta;
      if (this.lightningTimer > 8 + Math.random() * 12) {
        this.lightningTimer = 0;
        this.isLightningFlash = true;
        this.flashDuration = 0.18;
        // Play thunder after brief rumble
        setTimeout(() => {
          sounds.playThunder();
        }, 150);
      }
    } else {
      this.isLightningFlash = false;
    }

    if (this.isLightningFlash) {
      this.flashDuration -= delta;
      if (this.flashDuration <= 0) {
        this.isLightningFlash = false;
      }
    }

    // Compute target environment visuals based on weather & time of day
    return this.computeVisuals(isNightTime);
  }

  private computeVisuals(isNightTime: boolean): WeatherVisuals {
    if (this.isLightningFlash) {
      return {
        skyColor: new THREE.Color(0xf0f5ff),
        fogColor: new THREE.Color(0xe0edff),
        fogDensity: 0.035,
        sunIntensity: 2.5,
        ambientIntensity: 1.5,
        ambientColor: new THREE.Color(0xd0e0ff),
      };
    }

    if (this.currentWeather === 'rain') {
      if (isNightTime) {
        return {
          skyColor: new THREE.Color(0x0a0c16),
          fogColor: new THREE.Color(0x0e111d),
          fogDensity: 0.032,
          sunIntensity: 0.08,
          ambientIntensity: 0.18,
          ambientColor: new THREE.Color(0x506585),
        };
      } else {
        return {
          skyColor: new THREE.Color(0x566573),
          fogColor: new THREE.Color(0x607282),
          fogDensity: 0.028,
          sunIntensity: 0.45,
          ambientIntensity: 0.38,
          ambientColor: new THREE.Color(0x758a99),
        };
      }
    }

    if (this.currentWeather === 'thunderstorm') {
      if (isNightTime) {
        return {
          skyColor: new THREE.Color(0x05060d),
          fogColor: new THREE.Color(0x080912),
          fogDensity: 0.040,
          sunIntensity: 0.05,
          ambientIntensity: 0.12,
          ambientColor: new THREE.Color(0x354055),
        };
      } else {
        return {
          skyColor: new THREE.Color(0x2f3640),
          fogColor: new THREE.Color(0x353b48),
          fogDensity: 0.035,
          sunIntensity: 0.25,
          ambientIntensity: 0.25,
          ambientColor: new THREE.Color(0x485460),
        };
      }
    }

    if (this.currentWeather === 'snow') {
      if (isNightTime) {
        return {
          skyColor: new THREE.Color(0x131728),
          fogColor: new THREE.Color(0x1a2035),
          fogDensity: 0.030,
          sunIntensity: 0.15,
          ambientIntensity: 0.28,
          ambientColor: new THREE.Color(0x8a9bb5),
        };
      } else {
        return {
          skyColor: new THREE.Color(0xb0bec5),
          fogColor: new THREE.Color(0xcfd8dc),
          fogDensity: 0.025,
          sunIntensity: 0.65,
          ambientIntensity: 0.6,
          ambientColor: new THREE.Color(0xdce7eb),
        };
      }
    }

    // Default 'clear'
    if (isNightTime) {
      return {
        skyColor: new THREE.Color(0x0a0c1a),
        fogColor: new THREE.Color(0x0a0c1a),
        fogDensity: 0.020,
        sunIntensity: 0.1,
        ambientIntensity: 0.22,
        ambientColor: new THREE.Color(0xffffff),
      };
    } else {
      return {
        skyColor: new THREE.Color(0x78a7ff),
        fogColor: new THREE.Color(0x78a7ff),
        fogDensity: 0.018,
        sunIntensity: 1.3,
        ambientIntensity: 0.55,
        ambientColor: new THREE.Color(0xffffff),
      };
    }
  }

  public dispose() {
    sounds.stopRainAmbient();
    if (this.rainPoints) {
      this.scene.remove(this.rainPoints);
      this.rainGeometry?.dispose();
    }
    if (this.snowPoints) {
      this.scene.remove(this.snowPoints);
      this.snowGeometry?.dispose();
    }
  }
}
