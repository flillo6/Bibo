#!/usr/bin/env python3
"""
BIBO - Evolution 2 & 3 Automated Sprite Sheet Pipeline
Extracts, chroma-keys, despills, crops, and compiles 12-frame 512x512 sprite sheets
for both Mid Bibo (Evo 2) and Adult Bibo (Evo 3).
"""

import os
import shutil
import cv2
import numpy as np
from PIL import Image

BASE_DIR = r'c:\Users\franc\Desktop\_progettini_\Bibo'
FRAME_COUNT = 12
FRAME_SIZE = 512

EVO_TASKS = [
    {
        'evo_key': 'mid',
        'raw_subdir': 'mid',
        'animations': [
            ('idle_base', r'C:\Users\franc\Downloads\idle_base_evo2.mp4'),
            ('eat_biscuit', r'C:\Users\franc\Downloads\eat_biscuit_evo2.mp4'),
            ('clean_sponge', r'C:\Users\franc\Downloads\clean_sponge_evo2.mp4'),
            ('sleep', r'C:\Users\franc\Downloads\sleep_evo2.mp4'),
            ('click_annoyed', r'C:\Users\franc\Downloads\click_annoyed_evo2.mp4'),
            ('victory_hop', r'C:\Users\franc\Downloads\victory_hop_evo2.mp4'),
        ]
    },
    {
        'evo_key': 'adult',
        'raw_subdir': 'adult',
        'animations': [
            ('idle_base', r'C:\Users\franc\Downloads\idle_base_evo3.mp4'),
            ('eat_biscuit', r'C:\Users\franc\Downloads\eat_biscuit_evo3.mp4'),
            ('clean_sponge', r'C:\Users\franc\Downloads\clean_sponge_evo3.mp4'),
            ('sleep', r'C:\Users\franc\Downloads\sleep_evo3.mp4'),
            ('click_annoyed', r'C:\Users\franc\Downloads\click_annoyed_evo3.mp4'),
            ('victory_hop', r'C:\Users\franc\Downloads\victory_hop_evo3.mp4'),
        ]
    }
]

def process_single_video(anim_name, video_path, sprites_dir, raw_dir):
    print(f" -> Processing {anim_name} from {os.path.basename(video_path)}...")
    
    # 1. Archive raw video copy
    os.makedirs(raw_dir, exist_ok=True)
    dest_video = os.path.join(raw_dir, f"{anim_name}.mp4")
    if not os.path.exists(dest_video):
        shutil.copy2(video_path, dest_video)

    # 2. Prepare individual frames folder
    frames_folder = os.path.join(sprites_dir, anim_name)
    os.makedirs(frames_folder, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    sample_indices = np.linspace(0, total_frames - 1, FRAME_COUNT, dtype=int)

    extracted_frames = []

    for idx_pos, frame_idx in enumerate(sample_indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            print(f"   [WARN] Frame {frame_idx} could not be read.")
            continue

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        b, g, r = cv2.split(frame)

        # Precise green chroma-key mask
        mask = cv2.inRange(hsv, np.array([45, 70, 70]), np.array([76, 255, 255]))

        # High-precision green despill: clamp green channel to max(red, blue) where excess
        max_rb = np.maximum(r, b)
        g_clean = np.where(g > max_rb, max_rb, g)

        # Invert mask for alpha
        alpha = cv2.bitwise_not(mask)

        # Erode 1px to strip borders and suppress green halo
        kernel = np.ones((2, 2), np.uint8)
        alpha = cv2.erode(alpha, kernel, iterations=1)

        rgba = cv2.merge([r, g_clean, b, alpha])

        # Center crop 1080x1080 from 1920x1080 (420:1500)
        crop = rgba[:, 420:1500]

        img = Image.fromarray(crop)
        img_resized = img.resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)

        # Save individual frame
        frame_filename = os.path.join(frames_folder, f"frame_{idx_pos:02d}.png")
        img_resized.save(frame_filename)
        extracted_frames.append(img_resized)

    cap.release()

    # 3. Compile horizontal 12-frame sprite sheet (6144x512)
    sheet_width = FRAME_SIZE * len(extracted_frames)
    sheet_height = FRAME_SIZE
    sprite_sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))

    for i, f_img in enumerate(extracted_frames):
        sprite_sheet.paste(f_img, (i * FRAME_SIZE, 0))

    sheet_path = os.path.join(sprites_dir, f"{anim_name}.png")
    sprite_sheet.save(sheet_path)
    print(f"    [OK] Generated {sheet_path} ({sheet_width}x{sheet_height}, {len(extracted_frames)} frames)")
    return sheet_path

def main():
    print("==================================================")
    print("BIBO - COMPILING EVOLUTION 2 & 3 SPRITE SHEETS")
    print("==================================================")

    for evo in EVO_TASKS:
        evo_key = evo['evo_key']
        raw_dir = os.path.join(BASE_DIR, 'assets', 'raw_animations', evo['raw_subdir'])
        sprites_dir = os.path.join(BASE_DIR, 'assets', 'sprites', evo_key)
        os.makedirs(sprites_dir, exist_ok=True)

        print(f"\nProcessing Evolution: [{evo_key.upper()}]...")

        for anim_name, video_path in evo['animations']:
            process_single_video(anim_name, video_path, sprites_dir, raw_dir)

        # Mirror idle_base to idle_affamato, idle_stanco, idle_sporco
        idle_base_path = os.path.join(sprites_dir, "idle_base.png")
        if os.path.exists(idle_base_path):
            for extra_idle in ['idle_affamato.png', 'idle_stanco.png', 'idle_sporco.png']:
                dest_path = os.path.join(sprites_dir, extra_idle)
                shutil.copy2(idle_base_path, dest_path)
                print(f"    [OK] Mirrored idle_base to {extra_idle}")

    print("\n==================================================")
    print("ALL SPRITE SHEETS COMPILED SUCCESSFULLY!")
    print("==================================================")

if __name__ == '__main__':
    main()
