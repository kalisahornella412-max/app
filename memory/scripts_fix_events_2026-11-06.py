p = '/app/backend/seed_data.py'
s = open(p).read()
start = s.index('EVENTS = [')
end = s.index('\n]\n', start) + 3
tail_start = s.index('        "slug": "hrm-youth-leadership-info",', start)
tail = s[tail_start:end]  # keep the two HRM entries already verified
new_head = '''EVENTS = [
    {
        "slug": "canadian-immigrant-fair-halifax",
        "title": "Canadian Immigrant Fair — Halifax (ISANS participates)",
        "host": "Canadian Immigrant / ISANS",
        "category": "Job Fair",
        "audiences": ["immigrant"],
        "location": "Canadian Museum of Immigration at Pier 21",
        "host_url": "https://canadianimmigrant.ca/careerfair/halifax",
        "starts_at": "Annual · last held May 8, 2026",
        "description": "Free annual career, education and settlement fair for newcomers. ISANS runs a resume clinic and employer-connection booth (Skills Match, ORIS recruitment sessions). Year-round, ISANS posts recruitment and info sessions at isans.ca/events.",
        "image_url": IMG_LAPTOPS,
        "source_checked": "2026-11-06",
    },
    {
        "slug": "job-junction-library-dropin",
        "title": "Job Search Drop-In — Halifax Central Library",
        "host": "Job Junction & YMCA Nova Scotia Works",
        "category": "Workshop",
        "audiences": ["youth", "immigrant"],
        "location": "Halifax Central Library, 5440 Spring Garden Rd",
        "host_url": "https://halifax.bibliocommons.com/v2/events?q=Job+Support",
        "starts_at": "Recurring · see library calendar",
        "description": "Free resume, cover-letter, mock-interview and job-search help at the Central Library, delivered by Job Junction (Job Search Club & drop-ins, 902-455-9675) and YMCA Nova Scotia Works (one-on-one sessions). Check the library events calendar for this week's times.",
        "image_url": IMG_LAPTOPS,
        "source_checked": "2026-11-06",
    },
    {
        "slug": "ywca-ready-4-launch-info",
        "title": "Ready 4 Launch — Applications & Info",
        "host": "YWCA Halifax",
        "category": "Info Session",
        "audiences": ["youth", "immigrant"],
        "location": "YWCA Halifax",
        "host_url": "https://www.ywcahalifax.com/programs/employment-skills/",
        "starts_at": "Rolling applications · limited seats",
        "description": "Paid 14-week program for women, gender-diverse and Two-Spirit youth 15–30: 4 weeks of paid readiness workshops + a 10-week paid placement. Applications are reviewed on a rolling basis; call 902-410-8851 to ask about the next start date.",
        "image_url": IMG_GROUP,
        "source_checked": "2026-11-06",
    },
    {
        "slug": "bij-stem-bootcamp",
        "title": "BIJ STEM Summer Boot Camp & Youth Pitch",
        "host": "Black Business Initiative — Business is Jammin'",
        "category": "Showcase",
        "audiences": ["youth"],
        "location": "NSCC Ivany Campus, Dartmouth",
        "host_url": "https://www.bbi.ca/events",
        "starts_at": "Each summer · 2026 edition ran Aug 4",
        "description": "Week-long STEM and entrepreneurship boot camp for African Nova Scotian youth 14–18, ending in a pitch competition. BBI also hosts the Black Business Summit each March (2026: Mar 19–20, Halifax Convention Centre). Watch bbi.ca/events for 2027 dates.",
        "image_url": IMG_GROUP,
        "source_checked": "2026-11-06",
    },
    {
        "slug": "halifax-job-fair-expo",
        "title": "Halifax Job Fair & Training Expo",
        "host": "Career Fair Canada",
        "category": "Job Fair",
        "audiences": ["youth", "immigrant"],
        "location": "Halifax Convention Centre",
        "host_url": "https://careerfaircanada.ca/events/halifax-10-22-2026",
        "starts_at": "Recurring · last held Oct 22, 2026",
        "description": "Free, open-to-all hiring expo with Halifax employers and training providers recruiting on the spot. Bring printed resumes. Check the organizer's page for the next Halifax date.",
        "image_url": IMG_LAPTOPS,
        "source_checked": "2026-11-06",
    },
    {
        "slug": "ymca-newcomer-family-socials",
        "title": "YMCA Newcomer Family Socials & Teach and Talk",
        "host": "YMCA Centre for Immigrant Programs",
        "category": "Networking",
        "audiences": ["immigrant"],
        "location": "104-7071 Bayers Road, Halifax",
        "host_url": "https://ymcahfx.ca/ymca-active-living-program/",
        "starts_at": "Weekly socials · monthly workshops",
        "description": "Weekly Family Socials, day trips and informal English practice (Teach and Talk) for newcomers in HRM, plus help registering for sports and activities. (YREACH serves newcomers outside HRM.)",
        "image_url": IMG_GROUP,
        "source_checked": "2026-11-06",
    },
'''
new_tail = tail.replace('        "image_url": IMG_CITY,\n    },', '        "image_url": IMG_CITY,\n        "source_checked": "2026-11-06",\n    },').replace('        "image_url": IMG_LAPTOPS,\n    },', '        "image_url": IMG_LAPTOPS,\n        "source_checked": "2026-11-06",\n    },')
s = s[:start] + new_head + new_tail + s[end:]
# event feeds: drop MetroWorks (closed March 2025), fix Job Junction address
mw_start = s.index('    {\n        "slug": "metroworks-events",')
mw_end = s.index('    },\n', mw_start) + 7
s = s[:mw_start] + s[mw_end:]
s = s.replace('"description": "Weekly resume clinics, mock interviews, and employer info sessions at 6950 Mumford Road.",\n        "url": "https://jobjunction.ca/workshops/",',
              '"description": "Resume clinics, job-search drop-ins and employer info sessions at Halifax Shopping Centre (7001 Mumford Rd) and the Central Library.",\n        "url": "https://jobjunction.ca/events/",')
open(p, 'w').write(s)
print('ok')
