# ZC Smart Digital: Managed Virtual Assistant Explainer (final script)

**Length:** 45 s (44.97) · **Format:** 1920×1080, 30 fps · **Audience:** Filipino small-business owners
**Voice direction:** warm, professional English with a natural Filipina accent. Friendly, unhurried, about 150 words per minute. Smile on the CTA.
**Sample business:** Rosa's Catering (fictional). All figures on screen are sample data.

| Time | Scene (on screen) | Narration / caption |
|---|---|---|
| 0:00.4 – 0:03.0 | "Saturday rush" chip. *Busy day at Rosa's Catering.* Message window fills with orders and supplier notes. Clock runs. | It's a busy Saturday at Rosa's Catering. |
| 0:03.1 – 0:07.4 | A new inquiry ("Catering for 50 pax on Sunday?") gets pushed down and turns **Unanswered · 3h**. | Orders keep coming, and a new event inquiry slips by unanswered. |
| 0:07.5 – 0:11.5 | Gold ring draws around a VA avatar. *Meet your virtual assistant.* | That's where a ZC Smart Digital virtual assistant steps in. |
| 0:11.6 – 0:14.6 | Subtitle: *Managed by ZC Smart Digital · trained for your business.* | Managed, trained and ready for your business. |
| 0:14.7 – 0:20.1 | **1 · Inbox organized.** Unread counter drops 47 → 0 as messages file into Inquiries / Orders / Payments / Suppliers. | First, your inbox. Your VA sorts every message and flags new inquiries, |
| 0:20.2 – 0:24.4 | The Santos inquiry is flagged, and a reply types itself in the "Reply drafted by your VA" box. | then drafts a friendly reply in your tone, so no customer waits. |
| 0:24.5 – 0:28.3 | **2 · Appointment scheduled.** Week calendar. "Tasting · Santos family, Tue 2:00 PM" drops into a free slot. | Next, your calendar. Appointments get booked and confirmed, |
| 0:28.4 – 0:31.2 | Chips appear: **✓ Confirmed with client**, **Reminder sent**. | with reminders sent, and no more back-and-forth. |
| 0:31.3 – 0:34.0 | **3 · Weekly report ready.** KPI tiles count up: 18 inquiries, 7 bookings, 12 min avg first reply (sample data). | And every Friday, a clear weekly report |
| 0:34.0 – 0:37.1 | Daily inquiries bar chart grows. | shows your inquiries, bookings and response times. |
| 0:37.2 – 0:40.2 | *Get your time back.* | Get your time back with a managed virtual assistant. |
| 0:40.3 – 0:43.8 | Gold button **Book a Free Consultation**, then **zcsmartdigital.com**. Hold to 0:45. | Book a free consultation at zcsmartdigital.com. |

**Word count:** 103 · **Narration characters:** ~620. That fits easily in ElevenLabs' free monthly allowance of 10,000 characters.

## Plain narration (paste into a text-to-speech tool or hand to a voice artist)

It's a busy Saturday at Rosa's Catering. Orders keep coming, and a new event inquiry slips by unanswered.
That's where a ZC Smart Digital virtual assistant steps in. Managed, trained and ready for your business.
First, your inbox. Your VA sorts every message and flags new inquiries, then drafts a friendly reply in your tone, so no customer waits.
Next, your calendar. Appointments get booked and confirmed, with reminders sent, and no more back-and-forth.
And every Friday, a clear weekly report shows your inquiries, bookings and response times.
Get your time back with a managed virtual assistant. Book a free consultation at zcsmartdigital.com.

Pronunciation note: say "zcsmartdigital.com" as "Z-C smart digital dot com".

## Voice-over (done)

- **Voice:** ElevenLabs "Mel – Warm & Conversational" (Filipino English accent), model Eleven v4, **take 2**, approved by the client.
- **Fitting:** long pauses tightened to 0.25 s and speech sped up 6% (pitch kept), so the voice runs 0:00.4–0:43.8 and the video ends at 0:45.
- **Sync:** the animation follows the voice. `source/script.json` holds the caption times and a `warp` table that moves each scene to the moment its line is spoken.
- **Files:** `explainer.mp4` (narrated), `explainer-open-captions.mp4` (narrated + burned-in captions), `explainer.en.srt` / `explainer.en.vtt` (re-timed to the voice).
- **To re-record:** replace `source/narration-fitted.wav` with a new take (same length or shorter), update the caption times in `source/script.json`, and run `source/render-video.py`.
