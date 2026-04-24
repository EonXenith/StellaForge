import { useRef, useEffect, useState, useCallback } from 'react';
import { SceneManager } from './scene/SceneManager';
import { generateTerrain } from './planet/TerrainGenerator';
import { assignBiomes } from './planet/BiomeMap';
import { usePlanetStore, getSunDirection } from './store/usePlanetStore';
import { PlanetParametersPanel } from './ui/PlanetParametersPanel';
import { BiomePalette } from './ui/BiomePalette';
import { Toolbar } from './ui/Toolbar';
import { TopBar } from './ui/TopBar';
import { NewPlanetModal } from './ui/NewPlanetModal';
import { HelpModal } from './ui/HelpModal';
import { GalleryModal } from './ui/GalleryModal';
import { SaveDialog } from './ui/SaveDialog';
import { Toast } from './ui/Toast';
import { StarPanel } from './ui/StarPanel';
import { EnvironmentPanel } from './ui/EnvironmentPanel';
import { ToolManager } from './tools/ToolManager';
import { PlanetSaveService } from './services/PlanetSaveService';
import { ThumbnailService } from './services/ThumbnailService';
import { TEMPLATES } from './templates/presets';
import { flattenAdjacency } from './planet/Erosion';
import * as THREE from 'three';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);
  const saveServiceRef = useRef<PlanetSaveService | null>(null);
  const [newPlanetOpen, setNewPlanetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fpsVisible, setFpsVisible] = useState(false);
  const [smReady, setSmReady] = useState(false);

  // Initialize scene + services
  useEffect(() => {
    if (!containerRef.current) return;
    const sm = new SceneManager(containerRef.current);
    sceneManagerRef.current = sm;

    // Initial terrain generation
    const params = usePlanetStore.getState().terrainParams;
    generateTerrain(sm.planetData, params);
    const biomes = usePlanetStore.getState().biomes;
    assignBiomes(sm.planetData, biomes);
    sm.planet.updateBiomeColors(
      biomes.map((b) => b.color),
      biomes.map((b) => b.emissive)
    );
    sm.planetData.markHeightsDirty();
    sm.planetData.markBiomesDirty();

    // Initial sun direction
    const star = usePlanetStore.getState().starParams;
    const sunDir = getSunDirection(star.sunAzimuth, star.sunElevation);
    const sunVec = new THREE.Vector3(sunDir.x, sunDir.y, sunDir.z);
    sm.planet.material.uniforms.uSunDirection.value.copy(sunVec);
    sm.atmosphere.setSunDirection(sunVec);
    sm.ocean.setSunDirection(sunVec);
    sm.clouds.setSunDirection(sunVec);
    sm.rings.setSunDirection(sunVec);
    sm.star.setDirection(sunVec.clone());

    // Tool manager
    const tm = new ToolManager(sm);
    toolManagerRef.current = tm;

    // Save service with constructor injection
    const svc = new PlanetSaveService({
      getPlanetData: () => sm.planetData,
      getStoreState: () => usePlanetStore.getState() as unknown as Record<string, unknown>,
      applyStoreState: (config) => {
        const store = usePlanetStore.getState();
        store.setIsLoading(true);
        // Apply each config field
        usePlanetStore.setState(config);
        store.setIsLoading(false);
      },
      applyPlanetData: (heights, biomeIds) => {
        sm.planetData.heightmap.set(heights);
        sm.planetData.biomeIds.set(biomeIds);
        sm.planetData.markHeightsDirty();
        sm.planetData.markBiomesDirty();
        // Update uniforms from loaded state
        const state = usePlanetStore.getState();
        sm.planet.material.uniforms.uHeightScale.value = state.terrainParams.heightScale;
        sm.planet.material.uniforms.uRadius.value = state.terrainParams.radius;
        sm.planet.updateBiomeColors(
          state.biomes.map((b) => b.color),
          state.biomes.map((b) => b.emissive)
        );
      },
    });

    // Thumbnail service
    const thumbSvc = new ThumbnailService(sm.renderer, sm.scene);
    svc.setThumbnailService(thumbSvc);
    saveServiceRef.current = svc;

    setSmReady(true);

    // Dev-only: expose SceneManager for test harness
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__sceneManager = sm;
    }

    return () => {
      thumbSvc.dispose();
      tm.dispose();
      sm.dispose();
    };
  }, []);

  // React to terrain param changes
  const terrainParams = usePlanetStore((s) => s.terrainParams);
  const isLoading = usePlanetStore((s) => s.isLoading);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    // Skip regeneration during save hydration — data is already loaded
    if (isLoading) return;
    sm.planet.material.uniforms.uHeightScale.value = terrainParams.heightScale;
    sm.planet.material.uniforms.uRadius.value = terrainParams.radius;
    generateTerrain(sm.planetData, terrainParams);
    const biomes = usePlanetStore.getState().biomes;
    assignBiomes(sm.planetData, biomes);
  }, [terrainParams, isLoading]);

  // React to biome changes
  const biomes = usePlanetStore((s) => s.biomes);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.planet.updateBiomeColors(
      biomes.map((b) => b.color),
      biomes.map((b) => b.emissive)
    );
    assignBiomes(sm.planetData, biomes);
  }, [biomes]);

  // React to star changes
  const starParams = usePlanetStore((s) => s.starParams);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    const sunDir = getSunDirection(starParams.sunAzimuth, starParams.sunElevation);
    const sunVec = new THREE.Vector3(sunDir.x, sunDir.y, sunDir.z);
    sm.planet.material.uniforms.uSunDirection.value.copy(sunVec);
    sm.planet.material.uniforms.uSunColor.value.set(starParams.color.r, starParams.color.g, starParams.color.b);
    sm.star.setColor(new THREE.Color(starParams.color.r, starParams.color.g, starParams.color.b));
    sm.star.setIntensity(starParams.intensity);
    sm.star.setDirection(sunVec.clone());
    sm.atmosphere.setSunDirection(sunVec);
    sm.ocean.setSunDirection(sunVec);
    sm.ocean.setSunColor(starParams.color);
    sm.clouds.setSunDirection(sunVec);
    sm.rings.setSunDirection(sunVec);
    sm.syncSunFromStore();
    for (const moon of sm.moonInstances.values()) {
      moon.setSunDirection(sunVec);
      moon.setSunColor(starParams.color);
    }
  }, [starParams]);

  // Atmosphere
  const atmosphereParams = usePlanetStore((s) => s.atmosphereParams);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.atmosphere.setColor(atmosphereParams.color.r, atmosphereParams.color.g, atmosphereParams.color.b);
    sm.atmosphere.setIntensity(atmosphereParams.intensity);
    sm.atmosphere.mesh.visible = atmosphereParams.visible;
  }, [atmosphereParams]);

  // Ocean
  const oceanParams = usePlanetStore((s) => s.oceanParams);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.ocean.mesh.visible = oceanParams.enabled;
    sm.ocean.setSeaLevel(oceanParams.seaLevel);
    sm.ocean.setColors(oceanParams.colorShallow, oceanParams.colorDeep);
    sm.ocean.setWaveParams(oceanParams.waveSpeed, oceanParams.waveAmplitude);
  }, [oceanParams]);

  // Clouds
  const cloudParams = usePlanetStore((s) => s.cloudParams);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.clouds.mesh.visible = cloudParams.enabled;
    sm.clouds.setDensity(cloudParams.density);
    sm.clouds.setRotationSpeed(cloudParams.rotationSpeed);
    sm.clouds.setColor(cloudParams.color);
    sm.clouds.setAltitude(cloudParams.altitude);
  }, [cloudParams]);

  // Rings
  const ringParams = usePlanetStore((s) => s.ringParams);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.rings.mesh.visible = ringParams.enabled;
    sm.rings.setRadii(ringParams.innerRadius, ringParams.outerRadius);
    sm.rings.setTilt(ringParams.tilt);
    sm.rings.setColor(ringParams.color);
    sm.rings.setOpacity(ringParams.opacity);
  }, [ringParams]);

  // Moons
  const moons = usePlanetStore((s) => s.moons);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.reconcileMoons(moons);
  }, [moons]);

  // Day/night
  const dayNightParams = usePlanetStore((s) => s.dayNightParams);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.setDayNight(dayNightParams.enabled, dayNightParams.speed);
    sm.planet.material.uniforms.uDayNightEnabled.value = dayNightParams.enabled ? 1.0 : 0.0;
  }, [dayNightParams]);

  // Erosion handler
  const eroding = usePlanetStore((s) => s.eroding);
  useEffect(() => {
    const handler = () => {
      const sm = sceneManagerRef.current;
      const tm = toolManagerRef.current;
      const store = usePlanetStore.getState();
      if (!sm || store.eroding) return;

      store.setEroding(true);
      store.setErosionProgress(0);

      const erosionParams = usePlanetStore.getState().erosionParams;
      const { flat, offsets, lengths } = flattenAdjacency(sm.planetData.icosphere.adjacency);
      const heightmapCopy = new Float32Array(sm.planetData.heightmap);
      const positionsCopy = new Float32Array(sm.planetData.icosphere.positions);

      const worker = new Worker(new URL('./workers/erosion.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'progress') {
          usePlanetStore.getState().setErosionProgress(e.data.percent);
        } else if (e.data.type === 'done') {
          const { heightmap, deltaIndices, deltaOldValues, deltaNewValues } = e.data;
          // Apply result
          sm.planetData.heightmap.set(heightmap);
          sm.planetData.markHeightsDirty();

          // Build undo command
          if (tm) {
            const deltas = [];
            for (let i = 0; i < deltaIndices.length; i++) {
              deltas.push({ index: deltaIndices[i], oldValue: deltaOldValues[i], newValue: deltaNewValues[i] });
            }
            tm.getUndoManager().push({ type: 'height', deltas });
            usePlanetStore.getState().bumpVersion();
          }

          // Re-assign biomes
          const biomes = usePlanetStore.getState().biomes;
          assignBiomes(sm.planetData, biomes);

          usePlanetStore.getState().setEroding(false);
          worker.terminate();
        }
      };

      worker.postMessage(
        {
          type: 'erode',
          heightmap: heightmapCopy,
          adjacencyFlat: flat,
          adjacencyOffsets: offsets,
          adjacencyLengths: lengths,
          positions: positionsCopy,
          vertexCount: sm.planetData.icosphere.vertexCount,
          config: {
            iterations: erosionParams.iterations,
            sedimentCapacity: erosionParams.sedimentCapacity,
            depositionRate: erosionParams.depositionRate,
            evaporationRate: erosionParams.evaporationRate,
            inertia: erosionParams.inertia,
            maxSteps: 30,
          },
        },
        [heightmapCopy.buffer, flat.buffer, offsets.buffer, lengths.buffer, positionsCopy.buffer]
      );
    };

    window.addEventListener('stellaforge-erode', handler);
    return () => window.removeEventListener('stellaforge-erode', handler);
  }, [eroding]);

  // Keyboard shortcuts: FPS toggle, Gallery, Save
  const galleryOpen = usePlanetStore((s) => s.galleryOpen);
  const saveDialogOpen = usePlanetStore((s) => s.saveDialogOpen);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '`') {
        setFpsVisible((v) => !v);
        return;
      }

      // Only allow shortcuts when no modal is open
      const anyModalOpen = newPlanetOpen || helpOpen || galleryOpen || saveDialogOpen;
      if (anyModalOpen) return;

      if (e.key === 'g' || e.key === 'G') {
        usePlanetStore.getState().setGalleryOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        usePlanetStore.getState().setSaveDialogOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [newPlanetOpen, helpOpen, galleryOpen, saveDialogOpen]);

  // beforeunload guard
  const hasUnsavedChanges = usePlanetStore((s) => s.hasUnsavedChanges);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const handleNewPlanet = useCallback((templateIndex: number, seed: string) => {
    const template = TEMPLATES[templateIndex];
    const store = usePlanetStore.getState();
    store.setTerrainParams({ ...template.terrain, seed });
    store.setBiomes(template.biomes);
    store.setCurrentSave(null, null);
    store.markUnsaved();
  }, []);

  const handleScreenshot = useCallback(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.renderer.render(sm.scene, sm.camera);
    const dataUrl = sm.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'stellaforge-planet.png';
    link.href = dataUrl;
    link.click();
  }, []);

  return (
    <div className="w-screen h-screen relative">
      <div ref={containerRef} className="absolute inset-0" />
      <TopBar
        onNewPlanet={() => setNewPlanetOpen(true)}
        onScreenshot={handleScreenshot}
        onHelp={() => setHelpOpen(true)}
        sceneManager={smReady ? sceneManagerRef.current : null}
        fpsVisible={fpsVisible}
      />
      <PlanetParametersPanel />
      <BiomePalette />
      <StarPanel />
      <EnvironmentPanel />
      <Toolbar />
      <NewPlanetModal
        open={newPlanetOpen}
        onClose={() => setNewPlanetOpen(false)}
        onApply={handleNewPlanet}
      />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {saveServiceRef.current && (
        <>
          <GalleryModal saveService={saveServiceRef.current} />
          <SaveDialog saveService={saveServiceRef.current} />
        </>
      )}
      <Toast />
    </div>
  );
}
