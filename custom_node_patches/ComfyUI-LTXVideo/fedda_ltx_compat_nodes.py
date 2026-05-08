"""
Compatibility nodes for legacy LTX sulphur workflows.

These classes keep older workflow node IDs loadable on newer ComfyUI-LTXVideo
revisions. Two nodes are safe passthrough model wrappers. The tiled upsampler
forwards to core LTXVLatentUpsampler and ignores legacy tiling knobs.
"""

from __future__ import annotations

try:
    from comfy_extras.nodes_lt_upsampler import LTXVLatentUpsampler as _CoreLTXVLatentUpsampler
except Exception:
    _CoreLTXVLatentUpsampler = None


class LTXTextAttentionAmplifier:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "text_amplification": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 4.0, "step": 0.05}),
                "spatial_focus": ("FLOAT", {"default": 0.15, "min": 0.0, "max": 1.0, "step": 0.01}),
                "block_index_filter": ("STRING", {"default": ""}),
                "bypass": ("BOOLEAN", {"default": False}),
                "debug": ("BOOLEAN", {"default": False}),
            }
        }

    RETURN_TYPES = ("MODEL",)
    FUNCTION = "apply"
    CATEGORY = "ltxtricks/compat"

    def apply(self, model, text_amplification=1.0, spatial_focus=0.15, block_index_filter="", bypass=False, debug=False):
        # Legacy compatibility shim: keep graph valid even if enhancer nodepack is absent.
        return (model,)


class LTXLatentAnchorAware:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "strength": ("FLOAT", {"default": 0.11, "min": 0.0, "max": 2.0, "step": 0.01}),
                "cache_at_step": ("INT", {"default": 6, "min": 0, "max": 300, "step": 1}),
                "similarity_threshold": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01}),
                "decay_with_distance": ("FLOAT", {"default": 0.15, "min": 0.0, "max": 1.0, "step": 0.01}),
                "energy_threshold": ("FLOAT", {"default": 0.3, "min": 0.0, "max": 1.0, "step": 0.01}),
                "bypass": ("BOOLEAN", {"default": False}),
                "debug": ("BOOLEAN", {"default": False}),
                "advanced_mode": ("BOOLEAN", {"default": False}),
                "cache_mode": (["schedule", "single"], {"default": "schedule"}),
                "forwards_per_step": ("INT", {"default": 1, "min": 1, "max": 8, "step": 1}),
                "cache_warmup": ("INT", {"default": 50, "min": 0, "max": 300, "step": 1}),
                "anchor_frame": ("INT", {"default": 0, "min": 0, "max": 10000, "step": 1}),
                "depth_curve": (["flat", "linear", "exp"], {"default": "flat"}),
                "block_index_filter": ("STRING", {"default": ""}),
            },
            "optional": {
                "reference_image": ("IMAGE",),
                "vae": ("VAE",),
                "energy_latent": ("LATENT",),
                "sigmas": ("SIGMAS",),
            },
        }

    RETURN_TYPES = ("MODEL",)
    FUNCTION = "apply"
    CATEGORY = "ltxtricks/compat"

    def apply(
        self,
        model,
        strength=0.11,
        cache_at_step=6,
        similarity_threshold=0.5,
        decay_with_distance=0.15,
        energy_threshold=0.3,
        bypass=False,
        debug=False,
        advanced_mode=False,
        cache_mode="schedule",
        forwards_per_step=1,
        cache_warmup=50,
        anchor_frame=0,
        depth_curve="flat",
        block_index_filter="",
        reference_image=None,
        vae=None,
        energy_latent=None,
        sigmas=None,
    ):
        # Legacy compatibility shim: passthrough when dedicated anchor-aware pack is unavailable.
        return (model,)


class LTXVLatentUpsamplerTiled:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "samples": ("LATENT",),
                "upscale_model": ("LATENT_UPSCALE_MODEL",),
                "vae": ("VAE",),
                "tile_size": ("INT", {"default": 10, "min": 1, "max": 64, "step": 1}),
                "overlap": ("INT", {"default": 6, "min": 0, "max": 64, "step": 1}),
                "max_size_for_no_tile": ("INT", {"default": 20, "min": 1, "max": 4096, "step": 1}),
                "rotate_for_landscape": ("BOOLEAN", {"default": False}),
                "debug": ("BOOLEAN", {"default": False}),
            }
        }

    RETURN_TYPES = ("LATENT",)
    FUNCTION = "upsample_latent"
    CATEGORY = "latent/video"
    EXPERIMENTAL = True

    def upsample_latent(
        self,
        samples,
        upscale_model,
        vae,
        tile_size=10,
        overlap=6,
        max_size_for_no_tile=20,
        rotate_for_landscape=False,
        debug=False,
    ):
        if _CoreLTXVLatentUpsampler is None:
            return (samples,)

        return _CoreLTXVLatentUpsampler().upsample_latent(
            samples=samples,
            upscale_model=upscale_model,
            vae=vae,
        )
