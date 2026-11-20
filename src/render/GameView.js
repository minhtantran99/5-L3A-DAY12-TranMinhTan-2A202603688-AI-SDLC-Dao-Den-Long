import * as THREE from 'three';
import { TUNING } from '../core/config.js';

export class GameView {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0E1430');
    this.scene.fog = new THREE.FogExp2('#1B2350', 0.012);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      300
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(this.renderer.domElement);

    this.ambient = new THREE.AmbientLight('#FFE9B0', 0.2);
    this.scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight('#8FA3B8', '#0E1430', 0.35);
    this.scene.add(this.hemi);

    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({ color: '#12384A' })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -10.5;
    this.scene.add(sea);

    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    this.currentNightBuilt = null;

    // Player Mây
    this.playerGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.7, 6, 12),
      new THREE.MeshStandardMaterial({ color: '#E8E2D0' })
    );
    body.position.y = 0.7;
    this.playerGroup.add(body);

    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.07, 6, 12),
      new THREE.MeshStandardMaterial({ color: '#C8102E' })
    );
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.08;
    this.playerGroup.add(scarf);

    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.35, 16),
      new THREE.MeshStandardMaterial({ color: '#C9B48A' })
    );
    hat.position.y = 1.55;
    this.playerGroup.add(hat);

    const miniLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#FFE9B0' })
    );
    miniLantern.position.set(0.42, 1.32, 0.15);
    this.playerGroup.add(miniLantern);

    this.playerLight = new THREE.PointLight('#FFB347', 2.5, 12);
    this.playerLight.position.set(0, 1.4, 0);
    this.playerGroup.add(this.playerLight);
    this.scene.add(this.playerGroup);

    this.pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, TUNING.pulseRadius, 32),
      new THREE.MeshBasicMaterial({ color: '#FFE58A', side: THREE.DoubleSide, transparent: true, opacity: 0 })
    );
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.pulseRing);
    this.pulseEffectTimer = 0;

    this.lanternMeshes = new Map();
    this.moteMeshes = new Map();
    this.shadeMeshes = new Map();
    this.drifterMeshes = new Map();
    this.charmMeshes = new Map();
    this.colorblind = false;

    window.addEventListener('resize', () => {
      this.camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  _clearMap() {
    while (this.mapGroup.children.length > 0) {
      this.mapGroup.remove(this.mapGroup.children[0]);
    }
    for (const entry of this.lanternMeshes.values()) this.scene.remove(entry.group);
    this.lanternMeshes.clear();
    for (const m of this.moteMeshes.values()) this.scene.remove(m);
    this.moteMeshes.clear();
    for (const s of this.shadeMeshes.values()) this.scene.remove(s);
    this.shadeMeshes.clear();
    for (const d of this.drifterMeshes.values()) this.scene.remove(d);
    this.drifterMeshes.clear();
    for (const c of this.charmMeshes.values()) this.scene.remove(c);
    this.charmMeshes.clear();
  }

  _buildMap(night, map) {
    this._clearMap();
    this.currentNightBuilt = night;
    const grassMat = new THREE.MeshStandardMaterial({ color: '#2F5D50', roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#6B4A2F', roughness: 0.85 });
    const sandMat = new THREE.MeshStandardMaterial({ color: '#C9B48A', roughness: 0.9 });

    if (night === 1) {
      const island = new THREE.Mesh(new THREE.CylinderGeometry(40, 42, 2, 48), grassMat);
      island.position.y = -1;
      this.mapGroup.add(island);
    } else if (night === 2) {
      const islA = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 2, 40), grassMat);
      islA.position.set(0, -1, 0);
      this.mapGroup.add(islA);

      const islB = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 2, 40), grassMat);
      islB.position.set(70, -1, 0);
      this.mapGroup.add(islB);

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), woodMat);
      bridge.position.set(35, -0.2, 0);
      this.mapGroup.add(bridge);
    } else if (night === 3) {
      const tier0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 47, 2, 48), grassMat);
      tier0.position.y = -1;
      this.mapGroup.add(tier0);

      const tier1Shape = new THREE.Shape();
      tier1Shape.absarc(0, 0, 24, 0, Math.PI, false);
      tier1Shape.absarc(0, 0, 12, Math.PI, 0, true);
      const tier1Geo = new THREE.ExtrudeGeometry(tier1Shape, { depth: 3, bevelEnabled: false });
      tier1Geo.rotateX(Math.PI / 2);
      const tier1 = new THREE.Mesh(tier1Geo, sandMat);
      tier1.position.y = 3;
      this.mapGroup.add(tier1);

      const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 32), grassMat);
      tier2.position.y = 3;
      this.mapGroup.add(tier2);

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 16), woodMat);
      tower.position.set(0, 10, 0);
      this.mapGroup.add(tower);
    }

    for (const pad of map.jumpPads) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(pad.radius, pad.radius, 0.25, 16),
        new THREE.MeshBasicMaterial({ color: '#F2C14E' })
      );
      m.position.set(pad.pos[0], pad.pos[1] + 0.12, pad.pos[2]);
      this.mapGroup.add(m);
    }
  }

  triggerPulseVisual() {
    this.pulseEffectTimer = 0.35;
  }

  projectToScreen(worldPos) {
    const v = new THREE.Vector3(worldPos[0], worldPos[1] + 2.5, worldPos[2]);
    v.project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * this.container.clientWidth,
      y: (-v.y * 0.5 + 0.5) * this.container.clientHeight,
      inFront: v.z < 1,
    };
  }

  sync(sim, camYawDeg, timeS, cameraOverride = null) {
    if (this.currentNightBuilt !== sim.night) {
      this._buildMap(sim.night, sim.map);
    }

    this.playerGroup.position.set(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2]);
    this.playerGroup.rotation.y = sim.player.yawRad;

    const litCount = sim.lanterns.filter((l) => l.lit).length;
    this.ambient.intensity = 0.15 + 0.55 * (litCount / Math.max(1, sim.lanterns.length));

    for (const l of sim.lanterns) {
      let entry = this.lanternMeshes.get(l.id);
      if (!entry) {
        const group = new THREE.Group();
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.25, 2.6, 8),
          new THREE.MeshStandardMaterial({ color: '#6B4A2F' })
        );
        post.position.y = 1.3;
        group.add(post);

        const coreMat = new THREE.MeshStandardMaterial({ color: '#5B5F6E', emissive: '#000000' });
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.8), coreMat);
        core.position.y = 2.9;
        group.add(core);

        const light = new THREE.PointLight('#FFB347', 0, 14);
        light.position.y = 2.9;
        group.add(light);

        this.scene.add(group);
        entry = { group, core, coreMat, light };
        this.lanternMeshes.set(l.id, entry);
      }
      entry.group.position.set(l.pos[0], l.pos[1], l.pos[2]);
      if (l.lit) {
        const fuel = l.fuel60 / 60;
        const blinkOn = fuel >= 30 || Math.floor(timeS * 2) % 2 === 0;
        entry.core.scale.set(1, 1, 1);
        entry.coreMat.color.set(blinkOn ? '#FFE9B0' : '#5B5F6E');
        entry.coreMat.emissive.set(blinkOn ? '#FFB347' : '#000000');
        entry.light.intensity = blinkOn ? 4.0 : 0.6;
      } else {
        // Non-color distinction: unlit lanterns are 20% deflated
        entry.core.scale.set(1, 0.8, 1);
        entry.coreMat.color.set('#5B5F6E');
        entry.coreMat.emissive.set('#000000');
        entry.light.intensity = 0;
      }
    }

    const syncPool = (items, map, createFn, updateFn) => {
      const ids = new Set(items.map((x) => x.id));
      for (const [id, mesh] of map) {
        if (!ids.has(id)) {
          this.scene.remove(mesh);
          map.delete(id);
        }
      }
      for (const item of items) {
        let mesh = map.get(item.id);
        if (!mesh) {
          mesh = createFn(item);
          this.scene.add(mesh);
          map.set(item.id, mesh);
        }
        updateFn(mesh, item);
      }
    };

    syncPool(
      sim.motes,
      this.moteMeshes,
      () => new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshBasicMaterial({ color: '#FFF6C2' })),
      (mesh, m) => mesh.position.set(m.pos[0], m.pos[1] + 0.65 + Math.sin(timeS * 4 + m.pos[0]) * 0.15, m.pos[2])
    );

    syncPool(
      sim.shades,
      this.shadeMeshes,
      () =>
        new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.55, 0),
          new THREE.MeshStandardMaterial({ color: '#120A1A', emissive: '#7A3CFF', emissiveIntensity: 0.7 })
        ),
      (mesh, s) => {
        mesh.material.color.set(s.state === 'stunned' ? '#3A3450' : '#120A1A');
        mesh.material.emissive.set(this.colorblind ? '#00B3FF' : '#7A3CFF');
        mesh.position.set(s.pos[0], s.pos[1] + 0.9, s.pos[2]);
      }
    );

    syncPool(
      sim.drifters.filter((d) => d.state !== 'removed'),
      this.drifterMeshes,
      () =>
        new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 1.1, 8),
          new THREE.MeshStandardMaterial({ color: '#8FA3B8', emissive: '#1B2350' })
        ),
      (mesh, d) => {
        mesh.position.set(d.pos[0], d.pos[1] + 1.1, d.pos[2]);
        mesh.rotation.y = timeS * 3;
      }
    );

    syncPool(
      sim.charms.filter((c) => c.available),
      this.charmMeshes,
      () =>
        new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.7, 0.1),
          new THREE.MeshStandardMaterial({ color: '#C8102E', emissive: '#F2C14E', emissiveIntensity: 0.35 })
        ),
      (mesh, c) => {
        mesh.position.set(c.pos[0], c.pos[1] + 0.9 + Math.sin(timeS * 3) * 0.15, c.pos[2]);
        mesh.rotation.y = timeS * 2;
      }
    );

    if (this.pulseEffectTimer > 0) {
      this.pulseEffectTimer = Math.max(0, this.pulseEffectTimer - 1 / 60);
      this.pulseRing.position.set(sim.player.pos[0], sim.player.pos[1] + 0.2, sim.player.pos[2]);
      this.pulseRing.material.opacity = this.pulseEffectTimer * 2;
    } else {
      this.pulseRing.material.opacity = 0;
    }

    if (cameraOverride) {
      this.camera.position.set(cameraOverride.pos[0], cameraOverride.pos[1], cameraOverride.pos[2]);
      this.camera.lookAt(cameraOverride.lookAt[0], cameraOverride.lookAt[1], cameraOverride.lookAt[2]);
    } else {
      const yawRad = (camYawDeg * Math.PI) / 180;
      this.camera.position.set(
        sim.player.pos[0] - Math.sin(yawRad) * 9.5,
        sim.player.pos[1] + 5.0,
        sim.player.pos[2] - Math.cos(yawRad) * 9.5
      );
      this.camera.lookAt(sim.player.pos[0], sim.player.pos[1] + 1.2, sim.player.pos[2]);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
