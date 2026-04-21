import { useRef, useEffect, useState, useCallback } from 'react';
import { SceneManager } from './scene/SceneManager';
import { generateTerrain } from './planet/TerrainGenerator';
import { assignBiomes } from './planet/BiomeMap';
import { usePlanetStore } from './store/usePlanetStore';
import { PlanetParametersPanel } from './ui/PlanetParametersPanel';
import { BiomePalette } from './ui/BiomePalette';
import { Toolbar } from './ui/Toolbar';
import { TopBar } from './ui/TopBar';
import { NewPlanetModal } from './ui/NewPlanetModal';
import { HelpModal } from './ui/HelpModal';
import { StarPanel } from './ui/StarPanel';
import { ToolManager } from './tools/ToolManager';
import { TEMPLATES } from './templates/presets';
import * as THREE from 'three';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);
  const [newPlanetOpen, setNewPlanetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;
    const sm = new SceneManager(containerRef.current);
    sceneManagerRef.current = sm;

    // Initial terrain generation
    const params = usePlanetStore.getState().terrainParams;
    generateTerrain(sm.planetData, params);
    const biomes = usePlanetStore.getState().biomes;
    assignBiomes(sm.planetData, biomes);
    sm.planet.updateBiomeColors(biomes.map((b) => b.color));
    sm.planetData.markHeightsDirty();
    sm.planetData.markBiomesDirty();

    // Tool manager
    const tm = new ToolManager(sm);
    toolManagerRef.current = tm;

    return () => {
      tm.dispose();
      sm.dispose();
    };
  }, []);

  // React to terrain param changes
  const terrainParams = usePlanetStore((s) => s.terrainParams);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.planet.material.uniforms.uHeightScale.value = terrainParams.heightScale;
    sm.planet.material.uniforms.uRadius.value = terrainParams.radius;
    generateTerrain(sm.planetData, terrainParams);
    const biomes = usePlanetStore.getState().biomes;
    assignBiomes(sm.planetData, biomes);
  }, [terrainParams]);

  // React to biome changes
  const biomes = usePlanetStore((s) => s.biomes);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.planet.updateBiomeColors(biomes.map((b) => b.color));
    assignBiomes(sm.planetData, biomes);
  }, [biomes]);

  // React to star/atmosphere changes
  const starParams = usePlanetStore((s) => s.starParams);
  const atmosphereParams = usePlanetStore((s) => s.atmosphereParams);
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    const dir = new THREE.Vector3(starParams.direction.x, starParams.direction.y, starParams.direction.z);
    sm.planet.material.uniforms.uSunDirection.value.copy(dir.normalize());
    sm.planet.material.uniforms.uSunColor.value.set(starParams.color.r, starParams.color.g, starParams.color.b);
    sm.star.setColor(new THREE.Color(starParams.color.r, starParams.color.g, starParams.color.b));
    sm.star.setIntensity(starParams.intensity);
    sm.star.setDirection(dir.clone());
  }, [starParams]);

  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.atmosphere.setColor(atmosphereParams.color.r, atmosphereParams.color.g, atmosphereParams.color.b);
    sm.atmosphere.setIntensity(atmosphereParams.intensity);
    sm.atmosphere.mesh.visible = atmosphereParams.visible;
  }, [atmosphereParams]);

  const handleNewPlanet = useCallback((templateIndex: number, seed: string) => {
    const template = TEMPLATES[templateIndex];
    const store = usePlanetStore.getState();
    store.setTerrainParams({ ...template.terrain, seed });
    store.setBiomes(template.biomes);
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
      />
      <PlanetParametersPanel />
      <BiomePalette />
      <StarPanel />
      <Toolbar />
      <NewPlanetModal
        open={newPlanetOpen}
        onClose={() => setNewPlanetOpen(false)}
        onApply={handleNewPlanet}
      />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
