import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCENE_KEY = '@mindlog/scene_preference';
export type SceneType = 'nature' | 'cosmos';

export function useScenePreference() {
  const [scene, setScene] = useState<SceneType>('nature');

  useEffect(() => {
    AsyncStorage.getItem(SCENE_KEY)
      .then(v => { if (v === 'cosmos' || v === 'nature') setScene(v); })
      .catch(() => {});
  }, []);

  const toggleScene = useCallback(async () => {
    const next: SceneType = scene === 'nature' ? 'cosmos' : 'nature';
    setScene(next);
    await AsyncStorage.setItem(SCENE_KEY, next).catch(() => {});
  }, [scene]);

  return { scene, toggleScene };
}
