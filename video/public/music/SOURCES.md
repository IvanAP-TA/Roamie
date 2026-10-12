# Background music

All tracks come from Pixabay under the [Pixabay Content License](https://pixabay.com/service/license-summary/), which allows commercial use without attribution. When they were downloaded, on 2026-10-12, none was marked "Content ID Registered". Each file keeps the first 30 seconds of the track at 160 kbps.

The file name's first word is the format that uses the track: the automation (`pickMusic` in `automation/plan.mjs`) picks among them.

| File | Track | Author | Source |
|---|---|---|---|
| wheel-1-vlog-v2.mp3 | Vlog Version 2 | BombinSound | https://pixabay.com/music/funk-vlog-version-2-537789/ |
| wheel-2-upbeat-funk.mp3 | Upbeat | Sub_Clair | https://pixabay.com/music/funk-upbeat-571898/ |
| wheel-3-pop.mp3 | Pop - Pop Music | prettyjohn1 | https://pixabay.com/music/dance-pop-pop-music-503314/ |
| wheel-4-ukulele.mp3 | Happy Ukulele | BombinSound | https://pixabay.com/music/happy-childrens-tunes-happy-ukulele-512480/ |
| month-1-deep-house-sunset.mp3 | Deep House Sunset | sunset-house-grooves | https://pixabay.com/music/soft-house-deep-house-sunset-538759/ |
| month-2-tropical-house.mp3 | Tropical House Paradise | sunset-house-grooves | https://pixabay.com/music/soft-house-tropical-house-paradise-538758/ |
| month-3-sunny-travel-diary.mp3 | Vlog Sunny Travel Diary | alex-morgan | https://pixabay.com/music/lofi-vlog-sunny-travel-diary-578504/ |
| month-4-warm-acoustic.mp3 | Warm Acoustic Guitar | Universfield | https://pixabay.com/music/acoustic-group-warm-acoustic-guitar-232912/ |
| versus-1-lofi-vlog-beats.mp3 | Lofi Chill Vlog Beats | alex-morgan | https://pixabay.com/music/lofi-lofi-chill-vlog-beats-573883/ |
| versus-2-vlog-intro.mp3 | Vlog - Vlog Intro | prettyjohn1 | https://pixabay.com/music/beats-vlog-vlog-intro-505645/ |

To add a track: name it `<format>-<n>-<name>.mp3`, keep it short (30 s is plenty), check it isn't "Content ID Registered" and add a row here.

The sound effects in `public/sfx` are synthesised by `scripts/make-sfx.mjs`.
