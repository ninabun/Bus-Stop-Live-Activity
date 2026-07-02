# Bus Stop Live Activity

A company-lobby transport display for Hong Kong bus and minibus searches.

## Features

- Full route search for KMB/LWB and Citybus route catalogues
- Green minibus search placeholder and UI support
- Route result view: route number, operator, origin and destination
- Stop selection view for supported bus routes
- Real-time ETA lookup after selecting a stop
- Up to 10 company favourite stops for lobby display
- Display modes: all directions, outbound only, inbound only, company favourites
- Weather, humidity and active weather warnings from the Hong Kong Observatory
- Advertisement/company information panel and public holiday countdown
- Automatic refresh every 1 minute for configured favourite stops

## Data Sources

- KMB/LWB route, stop and ETA data: `https://data.etabus.gov.hk`
- Citybus route, stop and ETA data: `https://rt.data.gov.hk`
- Hong Kong Observatory weather and warning data: `https://data.weather.gov.hk`

## Use

Open `index.html` in a browser, or publish the repository root through GitHub Pages.

Employees can use the search box directly. Admin users can save company nearby stops in the right panel for the always-on lobby display.
