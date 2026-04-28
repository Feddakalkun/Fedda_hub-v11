#!/bin/bash
source venv/bin/activate
# --resume /mnt/LORAS/ms-out/msltx-4fingering/msltx-4fingering-step00000500-state \

rm -rf ./logs/*

rm -rf /home/ubuntu/hunyuan-lora-training/musubi-tuner/cache/cache_4
python ltx2_cache_latents.py \
 --dataset_config ltsway-breastsway-dataset.toml\
 --save_dataset_manifest dataset_manifest.json \
 --ltx2_checkpoint /home/ubuntu/comfyui/models/diffusion_models/ltx-2.3-22b-dev.safetensors \
 --device cuda \
 --vae_dtype bf16 \
 --ltx2_mode v \
 --ltx2_audio_source video

 python ltx2_cache_text_encoder_outputs.py \
 --dataset_config ltsway-breastsway-dataset.toml \
 --ltx2_checkpoint /home/ubuntu/comfyui/models/diffusion_models/ltx-2.3-22b-dev.safetensors \
 --gemma_root /mnt/MODELS/gemma-3-12b-it-qat-q4_0-unquantized/ \
 --gemma_load_in_8bit \
 --device cuda \
 --mixed_precision bf16 \
 --ltx2_mode v \
 --batch_size 1

PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True  accelerate launch --num_cpu_threads_per_process 1 --mixed_precision bf16 ltx2_train_network.py \
  --network_module networks.lora_ltx2 \
  --ltx_version 2.3 \
  --max_train_steps 3500 \
  --mixed_precision bf16 \
  --dataset_config ltsway-breastsway-dataset.toml \
  --gemma_load_in_8bit \
  --gemma_root /mnt/MODELS/gemma-3-12b-it-qat-q4_0-unquantized/ \
  --ltx2_checkpoint /home/ubuntu/comfyui/models/diffusion_models/ltx-2.3-22b-dev.safetensors \
  --ltx2_mode v \
  --fp8_base \
  --fp8_scaled \
  --flash_attn \
  --save_every_n_steps 500 --save_state \
  --gradient_checkpointing \
  --crepa \
  --crepa_args mode=backbone student_block_idx=16 teacher_block_idx=32 lambda_crepa=0.1 tau=1.0 num_neighbors=2 schedule=constant warmup_steps=0 normalize=true \
  --learning_rate 1 \
  --network_dim 32 \
  --network_alpha 32 \
  --optimizer_type prodigyopt.Prodigy \
  --optimizer_args "weight_decay=0.01" "decouple=True" "safeguard_warmup=True" "use_bias_correction=True" \
  --lr_scheduler_type "CosineAnnealingLR" \
  --lr_scheduler_args "T_max=3072" \
  --timestep_sampling shifted_logit_normal \
  --log_with tensorboard --logging_dir ./logs \
  --output_dir /mnt/LORAS/ms-out/2ltsway-breastsway  \
  --output_name 2ltsway-breastsway
