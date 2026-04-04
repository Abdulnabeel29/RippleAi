/**
 * Utility to check if the current browser environment supports WebGL.
 * MapLibre GL / react-map-gl require a valid WebGL context.
 */
export const checkWebGLSupport = () => {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch (e) {
        return false;
    }
};
