# Bus Stop Live Activity

1/12 scale Hong Kong smart bus stop display inspired by real departure screens.

## Features

- Real-time departure board layout for KMB, Citybus and mixed-stop routes
- Up to 10 configurable bus stops saved in the browser
- Display modes: all directions, outbound only, inbound only, selected routes only
- Weather, humidity and active weather warnings from the Hong Kong Observatory
- Advertisement panel and next public holiday countdown
- Automatic refresh every 1 minute after WiFi/network connection
- Demo mode when stop IDs are not configured

## Data Sources

- KMB ETA: `https://data.etabus.gov.hk`
- Citybus ETA: `https://rt.data.gov.hk`
- Hong Kong Observatory: `https://data.weather.gov.hk`

## Use

Open `index.html` in a browser. Add station IDs and route numbers in the settings panel, then press `儲存站點` or `立即更新`.

For GitHub Pages, publish the repository root and set Pages to serve from the main branch.
