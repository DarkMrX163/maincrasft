import * as THREE from 'three';
import { PLAYER_SKINS, PlayerSkin } from '../types/game';

export class PlayerCharacter {
  public group: THREE.Group;
  public head: THREE.Mesh;
  public body: THREE.Mesh;
  public leftArm: THREE.Mesh;
  public rightArm: THREE.Mesh;
  public leftLeg: THREE.Mesh;
  public rightLeg: THREE.Mesh;
  public heldItemMesh: THREE.Mesh | null = null;
  public nameBadge: THREE.Sprite;

  public targetPos = new THREE.Vector3();
  public targetYaw = 0;
  public targetPitch = 0;
  public isMoving = false;
  public walkTime = 0;

  constructor(
    public id: string,
    public name: string,
    public skinId: string = 'steve',
    public accentColor: string = '#3b82f6'
  ) {
    this.group = new THREE.Group();

    const skin = PLAYER_SKINS.find((s) => s.id === skinId) || PLAYER_SKINS[0];

    // Materials based on skin
    const headMat = new THREE.MeshStandardMaterial({ color: skin.headColor, roughness: 0.8 });
    const armMat = new THREE.MeshStandardMaterial({ color: skin.armsColor, roughness: 0.8 });
    const legMat = new THREE.MeshStandardMaterial({ color: skin.legsColor, roughness: 0.8 });

    // Head (0.5 x 0.5 x 0.5) with authentic Minecraft face
    const faceTex = this.createFaceTexture(skin);
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.8 });
    const headMaterials = [headMat, headMat, headMat, headMat, faceMat, headMat];
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.head = new THREE.Mesh(headGeo, headMaterials);
    this.head.position.y = 1.5;
    this.group.add(this.head);

    // Body (0.5 x 0.75 x 0.25) with authentic Minecraft shirt/armor
    const bodyTex = this.createBodyTexture(skin);
    const bodyMatFront = new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.8 });
    const bodyMatSides = new THREE.MeshStandardMaterial({ color: skin.bodyColor, roughness: 0.8 });
    const bodyMaterials = [bodyMatSides, bodyMatSides, bodyMatSides, bodyMatSides, bodyMatFront, bodyMatFront];
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    this.body = new THREE.Mesh(bodyGeo, bodyMaterials);
    this.body.position.y = 0.875;
    this.group.add(this.body);

    // Left Arm (0.2 x 0.7 x 0.2)
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    armGeo.translate(0, -0.3, 0);

    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.35, 1.2, 0);
    this.group.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Mesh(armGeo.clone(), armMat);
    this.rightArm.position.set(0.35, 1.2, 0);
    this.group.add(this.rightArm);

    // Left Leg (0.22 x 0.75 x 0.22)
    const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    legGeo.translate(0, -0.375, 0);

    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.13, 0.5, 0);
    this.group.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Mesh(legGeo.clone(), legMat);
    this.rightLeg.position.set(0.13, 0.5, 0);
    this.group.add(this.rightLeg);

    // Name Badge Sprite
    this.nameBadge = this.createNameBadgeSprite(name, skin.emoji);
    this.nameBadge.position.y = 2.05;
    this.group.add(this.nameBadge);

    // Enable shadows
    this.head.castShadow = true;
    this.body.castShadow = true;
    this.leftArm.castShadow = true;
    this.rightArm.castShadow = true;
    this.leftLeg.castShadow = true;
    this.rightLeg.castShadow = true;
  }

  private createFaceTexture(skin: PlayerSkin): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Skin background
    ctx.fillStyle = skin.headColor;
    ctx.fillRect(0, 0, 16, 16);

    if (skin.id === 'creeper_boy') {
      // Iconic Creeper face
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#052e16';
      // Creeper eyes
      ctx.fillRect(3, 4, 3, 3);
      ctx.fillRect(10, 4, 3, 3);
      // Creeper nose and mouth
      ctx.fillRect(6, 7, 4, 4);
      ctx.fillRect(4, 9, 2, 5);
      ctx.fillRect(10, 9, 2, 5);
    } else if (skin.id === 'enderman') {
      // Deep charcoal with glowing purple eyes
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(2, 8, 4, 1);
      ctx.fillRect(10, 8, 4, 1);
      ctx.fillStyle = '#e9d5ff';
      ctx.fillRect(4, 8, 1, 1);
      ctx.fillRect(11, 8, 1, 1);
    } else if (skin.id === 'diamond_steve') {
      // Diamond helmet
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 16, 5);
      ctx.fillRect(0, 5, 2, 11);
      ctx.fillRect(14, 5, 2, 11);
      ctx.fillRect(7, 5, 2, 6);
      // Steve face peek
      ctx.fillStyle = '#c49a6c';
      ctx.fillRect(2, 6, 5, 5);
      ctx.fillRect(9, 6, 5, 5);
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 7, 2, 2);
      ctx.fillRect(11, 7, 2, 2);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(4, 7, 1, 2);
      ctx.fillRect(11, 7, 1, 2);
    } else if (skin.id === 'zombie') {
      // Green zombie
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(0, 4, 2, 3);
      ctx.fillRect(14, 4, 2, 3);
      // Black sunken eyes
      ctx.fillStyle = '#052e16';
      ctx.fillRect(3, 7, 3, 2);
      ctx.fillRect(10, 7, 3, 2);
      // Zombie mouth
      ctx.fillStyle = '#14532d';
      ctx.fillRect(6, 12, 4, 2);
    } else if (skin.id === 'fox') {
      // Orange fox
      ctx.fillStyle = '#f97316';
      ctx.fillRect(0, 0, 16, 16);
      // Ears
      ctx.fillStyle = '#18181b';
      ctx.fillRect(2, 1, 3, 2);
      ctx.fillRect(11, 1, 3, 2);
      // White muzzle
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(4, 9, 8, 5);
      // Black nose
      ctx.fillStyle = '#18181b';
      ctx.fillRect(7, 10, 2, 2);
      // Blue eyes
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(3, 6, 2, 2);
      ctx.fillRect(11, 6, 2, 2);
    } else {
      // Classic Steve / Alex / Human
      // Hair
      ctx.fillStyle = skin.hairColor;
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(0, 4, 2, 4);
      ctx.fillRect(14, 4, 2, 4);

      // White eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 7, 3, 2);
      ctx.fillRect(10, 7, 3, 2);
      // Iris
      ctx.fillStyle = skin.eyeColor;
      ctx.fillRect(4, 7, 2, 2);
      ctx.fillRect(11, 7, 2, 2);

      // Beard / Smile
      ctx.fillStyle = skin.id === 'steve' ? '#5a3d28' : '#c27d60';
      ctx.fillRect(6, 12, 4, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  private createBodyTexture(skin: PlayerSkin): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 24;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Body base
    ctx.fillStyle = skin.bodyColor;
    ctx.fillRect(0, 0, 16, 24);

    if (skin.id === 'steve') {
      // Turquoise shirt with neck cutout
      ctx.fillStyle = '#00a8a8';
      ctx.fillRect(0, 0, 16, 24);
      ctx.fillStyle = '#c49a6c';
      ctx.fillRect(6, 0, 4, 3);
      // Belt
      ctx.fillStyle = '#1d2a6b';
      ctx.fillRect(0, 20, 16, 4);
    } else if (skin.id === 'alex') {
      // Green tunic with brown leather belt
      ctx.fillStyle = '#5b8731';
      ctx.fillRect(0, 0, 16, 24);
      ctx.fillStyle = '#dbb184';
      ctx.fillRect(6, 0, 4, 2);
      ctx.fillStyle = '#473523';
      ctx.fillRect(0, 18, 16, 3);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(7, 18, 2, 3);
    } else if (skin.id === 'creeper_boy') {
      // Creeper icon on hoodie
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, 0, 16, 24);
      ctx.fillStyle = '#052e16';
      ctx.fillRect(5, 5, 2, 2);
      ctx.fillRect(9, 5, 2, 2);
      ctx.fillRect(7, 7, 2, 3);
      ctx.fillRect(6, 9, 1, 3);
      ctx.fillRect(9, 9, 1, 3);
    } else if (skin.id === 'diamond_steve') {
      // Diamond chestplate
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 16, 24);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(2, 2, 12, 16);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(3, 3, 3, 2);
      ctx.fillRect(4, 5, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  private createNameBadgeSprite(name: string, emoji: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Rounded background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.roundRect(10, 8, 236, 48, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Text
    ctx.font = 'bold 24px Rubik, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${emoji} ${name}`, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.35, 1);
    return sprite;
  }

  public updateSkin(skinId: string, name: string) {
    const skin = PLAYER_SKINS.find((s) => s.id === skinId);
    if (!skin) return;

    this.skinId = skinId;
    this.name = name;

    const armMat = new THREE.MeshStandardMaterial({ color: skin.armsColor, roughness: 0.8 });
    const legMat = new THREE.MeshStandardMaterial({ color: skin.legsColor, roughness: 0.8 });
    this.leftArm.material = armMat;
    this.rightArm.material = armMat;
    this.leftLeg.material = legMat;
    this.rightLeg.material = legMat;

    // Update head
    const faceTex = this.createFaceTexture(skin);
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.8 });
    const headMat = new THREE.MeshStandardMaterial({ color: skin.headColor, roughness: 0.8 });
    this.head.material = [headMat, headMat, headMat, headMat, faceMat, headMat];

    // Update body
    const bodyTex = this.createBodyTexture(skin);
    const bodyMatFront = new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.8 });
    const bodyMatSides = new THREE.MeshStandardMaterial({ color: skin.bodyColor, roughness: 0.8 });
    this.body.material = [bodyMatSides, bodyMatSides, bodyMatSides, bodyMatSides, bodyMatFront, bodyMatFront];

    // Update sprite
    this.group.remove(this.nameBadge);
    this.nameBadge = this.createNameBadgeSprite(name, skin.emoji);
    this.nameBadge.position.y = 2.05;
    this.group.add(this.nameBadge);
  }

  public updateAnimation(delta: number, isSneaking = false) {
    const dist = this.group.position.distanceTo(this.targetPos);
    this.isMoving = dist > 0.05;

    // Smoothly interpolate position & rotation
    this.group.position.lerp(this.targetPos, Math.min(1, delta * 15));
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.targetYaw, delta * 15);
    this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, this.targetPitch, delta * 15);

    if (isSneaking) {
      this.body.position.y = 0.75;
      this.head.position.y = 1.35;
      this.leftArm.position.y = 1.05;
      this.rightArm.position.y = 1.05;
    } else {
      this.body.position.y = 0.875;
      this.head.position.y = 1.5;
      this.leftArm.position.y = 1.2;
      this.rightArm.position.y = 1.2;
    }

    if (this.isMoving) {
      this.walkTime += delta * 10;
      const swing = Math.sin(this.walkTime) * 0.6;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x = swing * 0.8;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }
  }

  public setHeldItem(itemColor: string | null) {
    if (this.heldItemMesh) {
      this.rightArm.remove(this.heldItemMesh);
      this.heldItemMesh = null;
    }
    if (itemColor) {
      const geo = new THREE.BoxGeometry(0.12, 0.25, 0.12);
      const mat = new THREE.MeshStandardMaterial({ color: itemColor, roughness: 0.6 });
      this.heldItemMesh = new THREE.Mesh(geo, mat);
      this.heldItemMesh.position.set(0, -0.4, 0.15);
      this.rightArm.add(this.heldItemMesh);
    }
  }
}
