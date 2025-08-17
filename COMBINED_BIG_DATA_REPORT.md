# Big Data Showdown: Neo.mjs vs. React + AG Grid

## Executive Summary
This report provides a focused analysis of the **true rendering performance** of the Neo.mjs grid versus a best-in-class React implementation using AG Grid. By isolating the **UI Update Time**—the actual time spent rendering DOM changes—we can see past identical data-generation overhead and measure the core architectural efficiency of each framework.

The results are definitive. Neo.mjs consistently outperforms React + AG Grid by a significant margin, particularly in demanding, large-scale scenarios. This demonstrates the tangible user experience benefits of Neo.mjs's multi-threaded architecture, which keeps the main thread free and the UI responsive, even under heavy load.

---

## Comparative Performance Analysis (UI Update Times)
Here, we compare the average production mode `UI Update Time` in milliseconds (ms). This metric represents the pure grid rendering performance. Lower is better.

### Change Columns from 50 to 200 (with 100k rows)
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **395.26** | 2966.30 | **7.5x faster** |
| **Firefox** | **390.60** | 4710.00 | **12.1x faster** |
| **Webkit** | **419.20** | 5406.00 | **12.9x faster** |

### Change Rows from 1,000 to 100,000
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **169.48** | 899.30 | **5.3x faster** |
| **Firefox** | **122.00** | 1818.00 | **14.9x faster** |
| **Webkit** | **140.00** | 1200.00 | **8.6x faster** |

### Change Columns from 50 to 75
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **28.18** | 123.20 | **4.4x faster** |
| **Firefox** | **31.60** | 73.00 | **2.3x faster** |
| **Webkit** | **47.00** | 106.00 | **2.3x faster** |

### Change Rows from 1,000 to 5,000
| Browser | Neo.mjs UI Time (ms) | React AG Grid UI Time (ms) | Neo.mjs Advantage |
|:---|---:|---:|:---:|
| **Chromium** | **25.28** | 139.40 | **5.5x faster** |
| **Firefox** | **36.40** | 129.00 | **3.5x faster** |
| **Webkit** | **50.00** | 113.00 | **2.3x faster** |

---
# Detailed Side-by-Side Results

## Change Columns from 50 to 200 (with 100k rows)

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 2979.26 ± 11.24 | 386.78 ± 7.58 |
| Chromium | dev | React + AG Grid | 5461.30 ± 0.00 | 2958.80 ± 0.00 |
| Chromium | prod | Neo.mjs | 3043.60 ± 72.15 | 395.26 ± 7.65 |
| Chromium | prod | React + AG Grid | 5446.40 ± 0.00 | 2966.30 ± 0.00 |
| Firefox | dev | Neo.mjs | 2170.20 ± 29.49 | 386.80 ± 3.66 |
| Firefox | dev | React + AG Grid | 6275.00 ± 0.00 | 4478.00 ± 0.00 |
| Firefox | prod | Neo.mjs | 2171.00 ± 17.85 | 390.60 ± 6.53 |
| Firefox | prod | React + AG Grid | 6530.00 ± 0.00 | 4710.00 ± 0.00 |
| Webkit | dev | Neo.mjs | 2892.20 ± 67.46 | 405.40 ± 14.35 |
| Webkit | dev | React + AG Grid | 8088.00 ± 0.00 | 5396.00 ± 0.00 |
| Webkit | prod | Neo.mjs | 2896.40 ± 70.56 | 419.20 ± 40.88 |
| Webkit | prod | React + AG Grid | 8192.00 ± 0.00 | 5406.00 ± 0.00 |

## Change Columns from 50 to 75

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 77.64 ± 4.93 | 27.60 ± 2.13 |
| Chromium | dev | React + AG Grid | 219.50 ± 0.00 | 121.40 ± 0.00 |
| Chromium | prod | Neo.mjs | 78.32 ± 5.06 | 28.18 ± 2.04 |
| Chromium | prod | React + AG Grid | 220.60 ± 0.00 | 123.20 ± 0.00 |
| Firefox | dev | Neo.mjs | 94.80 ± 4.26 | 33.60 ± 2.87 |
| Firefox | dev | React + AG Grid | 221.00 ± 0.00 | 72.00 ± 0.00 |
| Firefox | prod | Neo.mjs | 91.80 ± 4.12 | 31.60 ± 1.02 |
| Firefox | prod | React + AG Grid | 219.00 ± 0.00 | 73.00 ± 0.00 |
| Webkit | dev | Neo.mjs | 112.40 ± 13.43 | 43.80 ± 8.61 |
| Webkit | dev | React + AG Grid | 159.00 ± 0.00 | 106.00 ± 0.00 |
| Webkit | prod | Neo.mjs | 119.80 ± 11.62 | 47.00 ± 8.17 |
| Webkit | prod | React + AG Grid | 161.00 ± 0.00 | 106.00 ± 0.00 |

## Change Rows from 1,000 to 100,000

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 835.48 ± 5.85 | 161.02 ± 2.46 |
| Chromium | dev | React + AG Grid | 1543.10 ± 0.00 | 914.50 ± 0.00 |
| Chromium | prod | Neo.mjs | 871.20 ± 62.70 | 169.48 ± 28.04 |
| Chromium | prod | React + AG Grid | 1528.20 ± 0.00 | 899.30 ± 0.00 |
| Firefox | dev | Neo.mjs | 688.00 ± 17.03 | 137.80 ± 13.91 |
| Firefox | dev | React + AG Grid | 1928.00 ± 0.00 | 1478.00 ± 0.00 |
| Firefox | prod | Neo.mjs | 656.40 ± 17.42 | 122.00 ± 12.70 |
| Firefox | prod | React + AG Grid | 2275.00 ± 0.00 | 1818.00 ± 0.00 |
| Webkit | dev | Neo.mjs | 453.60 ± 14.32 | 130.60 ± 3.56 |
| Webkit | dev | React + AG Grid | 1517.00 ± 0.00 | 1202.00 ± 0.00 |
| Webkit | prod | Neo.mjs | 455.20 ± 15.71 | 140.00 ± 18.68 |
| Webkit | prod | React + AG Grid | 1535.00 ± 0.00 | 1200.00 ± 0.00 |

## Change Rows from 1,000 to 5,000

| Browser | Mode | Framework | Total Time (ms) | UI Update Time (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 98.04 ± 1.43 | 25.54 ± 1.25 |
| Chromium | dev | React + AG Grid | 248.90 ± 0.00 | 137.90 ± 0.00 |
| Chromium | prod | Neo.mjs | 98.58 ± 1.40 | 25.28 ± 0.78 |
| Chromium | prod | React + AG Grid | 251.20 ± 0.00 | 139.40 ± 0.00 |
| Firefox | dev | Neo.mjs | 105.60 ± 4.59 | 35.60 ± 1.02 |
| Firefox | dev | React + AG Grid | 268.00 ± 0.00 | 130.00 ± 0.00 |
| Firefox | prod | Neo.mjs | 103.20 ± 4.35 | 36.40 ± 1.36 |
| Firefox | prod | React + AG Grid | 268.00 ± 0.00 | 129.00 ± 0.00 |
| Webkit | dev | Neo.mjs | 118.40 ± 7.00 | 41.40 ± 9.58 |
| Webkit | dev | React + AG Grid | 189.00 ± 0.00 | 111.00 ± 0.00 |
| Webkit | prod | Neo.mjs | 128.60 ± 11.74 | 50.00 ± 10.43 |
| Webkit | prod | React + AG Grid | 190.00 ± 0.00 | 113.00 ± 0.00 |

## filter-grid (clear)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 28.12 ± 2.69 |
| Chromium | dev | React + AG Grid | 127.20 ± 0.00 |
| Chromium | prod | Neo.mjs | 28.54 ± 3.07 |
| Chromium | prod | React + AG Grid | 123.70 ± 0.00 |
| Firefox | dev | Neo.mjs | 38.00 ± 6.13 |
| Firefox | dev | React + AG Grid | 144.00 ± 0.00 |
| Firefox | prod | Neo.mjs | 31.80 ± 14.27 |
| Firefox | prod | React + AG Grid | 153.00 ± 0.00 |
| Webkit | dev | Neo.mjs | 37.20 ± 4.26 |
| Webkit | dev | React + AG Grid | 94.00 ± 0.00 |
| Webkit | prod | Neo.mjs | 47.80 ± 13.01 |
| Webkit | prod | React + AG Grid | 93.00 ± 0.00 |

## filter-grid (first)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 66.52 ± 9.47 |
| Chromium | dev | React + AG Grid | 112.60 ± 0.00 |
| Chromium | prod | Neo.mjs | 67.34 ± 7.99 |
| Chromium | prod | React + AG Grid | 133.60 ± 0.00 |
| Firefox | dev | Neo.mjs | 56.00 ± 1.79 |
| Firefox | dev | React + AG Grid | 139.00 ± 0.00 |
| Firefox | prod | Neo.mjs | 55.00 ± 5.02 |
| Firefox | prod | React + AG Grid | 136.00 ± 0.00 |
| Webkit | dev | Neo.mjs | 101.60 ± 9.99 |
| Webkit | dev | React + AG Grid | 107.00 ± 0.00 |
| Webkit | prod | Neo.mjs | 95.40 ± 8.14 |
| Webkit | prod | React + AG Grid | 124.00 ± 0.00 |

## filter-grid (second)

| Browser | Mode | Framework | Total Time (ms) |
| :--- | :--- | :--- | :--- |
| Chromium | dev | Neo.mjs | 25.58 ± 3.01 |
| Chromium | dev | React + AG Grid | 133.50 ± 0.00 |
| Chromium | prod | Neo.mjs | 27.34 ± 2.45 |
| Chromium | prod | React + AG Grid | 108.40 ± 0.00 |
| Firefox | dev | Neo.mjs | 38.40 ± 8.78 |
| Firefox | dev | React + AG Grid | 111.00 ± 0.00 |
| Firefox | prod | Neo.mjs | 38.40 ± 7.50 |
| Firefox | prod | React + AG Grid | 135.00 ± 0.00 |
| Webkit | dev | Neo.mjs | 66.00 ± 2.28 |
| Webkit | dev | React + AG Grid | 114.00 ± 0.00 |
| Webkit | prod | Neo.mjs | 55.00 ± 12.57 |
| Webkit | prod | React + AG Grid | 131.00 ± 0.00 |


The data is aggregated over **5 run(s)**.

## System Information

| Property   | Value       |
|------------|-------------|
| OS Name    | macOS |
| OS Version | 15.5 |
| Total RAM  | 64GB |
| CPU Cores  | 16 |
| Node.js    | v22.3.0 |
| Playwright | 1.54.2 |
| Platform   | darwin |
| Architecture | x64 |

## Browser Versions

| Browser    | Version     |
|------------|-------------|
| Chrome     | Google Chrome 139.0.7258.128 |
| Firefox    | Mozilla Firefox 141.0.3 |
| Safari     | Safari kMDItemVersion = "18.5" |

---
*This file is auto-generated on Sun, 17 Aug 2025 13:21:14 GMT. Do not edit manually.*