"use client";

import { useCallback, useRef, useEffect, useState } from 'react';
import useSettingStore from '@/store/useSettingStore';
import { SoundControlKey } from '@/types/useSettingStore.interface';

/**
 * A hook for playing sound effects in a React application.
 * 
 * @param {string} soundUrl - URL or path to the sound file
 * @param {Object} options - Configuration options
 * @param {number} options.volume - Volume level between 0 and 1 (default: 1)
 * @param {boolean} options.preload - Whether to preload the audio (default: true)
 * @param {boolean} options.loop - Whether the sound should loop infinitely (default: false)
 * @param {boolean} options.playRandomly - Whether to play the sound randomly (default: false)
 * @param {number} options.minInterval - Minimum interval between random plays in ms (default: 5000)
 * @param {number} options.maxInterval - Maximum interval between random plays in ms (default: 15000)
 * @param {boolean} options.autoplay - Whether to automatically play the sound when the component mounts (default: false)
 * @returns {Object} - Contains functions to control sound playback, a stop function, and playing status
 */
const useSoundEffect = (
    soundUrl: string,
    options: { 
        volume?: number; 
        preload?: boolean;
        loop?: boolean;
        playRandomly?: boolean;
        minInterval?: number;
        maxInterval?: number;
        autoplay?: boolean;
        settingsKey?: SoundControlKey;
    } = {}
) => {
    const { 
        volume: initialVolume = 1, 
        preload = true,
        loop = false,
        playRandomly = false,
        minInterval = 5000,
        maxInterval = 15000,
        autoplay = false,
        settingsKey
    } = options;
    
    // Get settings from the store
    const settings = useSettingStore();
    const storeVolume = settingsKey ? settings[settingsKey]?.volume ?? initialVolume : initialVolume;
    const isMuted = settingsKey ? settings[settingsKey]?.isMuted ?? false : false;
    const volume = isMuted ? 0 : storeVolume;
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isActiveRef = useRef<boolean>(true);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentVolume, setCurrentVolume] = useState<number>(storeVolume);

    // Preload the audio if specified and update volume when settings change
    useEffect(() => {
        if (preload && !audioRef.current) {
            audioRef.current = new Audio(soundUrl);
        }
        if (audioRef.current) {
            audioRef.current.volume = Math.min(1, Math.max(0, volume));
            audioRef.current.preload = 'auto';
        }

        // Handle autoplay if enabled
        if (autoplay) {
            playSoundEffect();
        }

        return () => {
            // Clean up on unmount
            stopSoundEffect();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            isActiveRef.current = false;
        };
    }, [soundUrl, volume, preload, autoplay]);

    // Handle random playback
    useEffect(() => {
        if (playRandomly && isActiveRef.current) {
            startRandomPlayback();
        } else if (!playRandomly && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [playRandomly, minInterval, maxInterval]);

    const startRandomPlayback = useCallback(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Schedule the first random play
        const scheduleNextPlay = () => {
            const randomDelay = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
            return setTimeout(() => {
                if (isActiveRef.current) {
                    playSoundEffect();
                    intervalRef.current = scheduleNextPlay();
                }
            }, randomDelay);
        };

        intervalRef.current = scheduleNextPlay();
    }, [minInterval, maxInterval]);

    const playSoundEffect = useCallback(() => {
        // Clean up any previous audio element that might be playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Create a new audio element
        const audio = new Audio(soundUrl);
        audio.volume = Math.min(1, Math.max(0, currentVolume));
        audio.loop = loop;

        // Set the audio ref to the new element
        audioRef.current = audio;

        // Update playing status
        setIsPlaying(true);

        // Play the sound and handle cleanup when finished
        audio.play().catch(error => {
            console.error('Error playing sound effect:', error);
            setIsPlaying(false);
        });

        // Clean up after the sound has finished playing (only if not looping)
        if (!loop) {
            audio.addEventListener('ended', () => {
                if (audioRef.current === audio) {
                    audioRef.current = null;
                    setIsPlaying(false);
                }
            });
        }
    }, [soundUrl, currentVolume, loop]);

    const stopSoundEffect = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
            setIsPlaying(false);
        }
    }, []);

    /**
     * Adjusts the volume of the currently playing sound and updates the volume setting for future playback
     * @param {number} newVolume - New volume level between 0 and 1
     * @returns {number} - The actual volume that was set after clamping
     */
    const adjustVolume = useCallback((newVolume: number): number => {
        // Clamp volume between 0 and 1
        const clampedVolume = Math.min(1, Math.max(0, newVolume));
        
        // Update the current volume state
        setCurrentVolume(clampedVolume);
        
        // If audio is currently playing, update its volume immediately
        if (audioRef.current) {
            audioRef.current.volume = clampedVolume;
        }
        
        return clampedVolume;
    }, []);

    return {
        play: playSoundEffect,
        stop: stopSoundEffect,
        startRandom: startRandomPlayback,
        adjustVolume,
        isPlaying,
        currentVolume
    };
};

export default useSoundEffect;