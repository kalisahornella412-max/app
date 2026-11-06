import re, sys
p = '/app/backend/seed_data.py'
s = open(p).read()
CHECKED = '"source_checked": "2026-11-06",'

def block(slug):
    i = s.index(f'"slug": "{slug}"')
    j = s.find('"slug": "', i + 10)
    j = len(s) if j == -1 else j
    return i, j

def set_field(slug, field, value):
    global s
    i, j = block(slug)
    b = s[i:j]
    if isinstance(value, str):
        rep = '"%s": %s' % (field, '"' + value.replace('"', '\\"') + '"')
    elif isinstance(value, bool):
        rep = '"%s": %s' % (field, 'True' if value else 'False')
    elif isinstance(value, list):
        rep = '"%s": [%s]' % (field, ', '.join('"%s"' % v for v in value))
    else:
        rep = '"%s": %s' % (field, value)
    pat = re.compile(r'"%s": (\[[^\]]*\]|"(?:[^"\\]|\\.)*"|[^,\n]+)' % field)
    nb, n = pat.subn(rep, b, count=1)
    if n == 0:
        # add after apply_url line
        nb = re.sub(r'(\n(\s*)"apply_url": [^\n]*\n)', r'\1\2%s\n' % rep.replace('\\', '\\\\') + ',', b, count=1)
        assert nb != b, (slug, field)
    s = s[:i] + nb + s[j:]

def stamp(slug):
    global s
    i, j = block(slug)
    b = s[i:j]
    if 'source_checked' in b:
        return
    nb = re.sub(r'(\n(\s*)"apply_url": [^\n]*\n)', lambda m: m.group(1) + m.group(2) + CHECKED + '\n', b, count=1)
    assert nb != b, slug
    s = s[:i] + nb + s[j:]

# ---- YMCA youth ----
set_field('ymca-youth', 'name', 'YMCA Youth Leadership & Outreach Programs')
set_field('ymca-youth', 'age_min', 13); set_field('ymca-youth', 'age_max', 30)
set_field('ymca-youth', 'tags', ['leadership', 'newcomer-youth', 'paid placement', 'tutoring'])
set_field('ymca-youth', 'short_description', 'Youth Outreach (13–21, incl. newcomer youth), LEAP paid leadership placements (15–30), EDGE job-readiness (18–26) and tutoring/mentorship for Grade 11–12 and first-year students.')
set_field('ymca-youth', 'description', "The YMCA of Greater Halifax/Dartmouth runs several youth programs: Youth Outreach for ages 13–21 (homework club, Y Boys / Y Girls groups, support for newcomer youth); the Youth Leadership Advancement Program (LEAP), a paid program for ages 15–30 with four weeks of training and a six-month placement; EDGE, a job-readiness program for ages 18–26; the Youth Educational Supports Program (tutoring, career planning and mentorship for Grade 11–12 and first-year post-secondary students); and Youth Exchanges Canada trips for ages 12–17. Check the YMCA site for current intake dates and eligibility for each program.")

# ---- Phoenix ----
set_field('phoenix-youth', 'short_description', 'Walk-in support hub, housing, counselling, health services, and the Learning & Employment Centre for Halifax youth 16–24; therapy and community-centre programs from age 11.')
set_field('phoenix-youth', 'description', 'Phoenix Youth Programs serves youth aged 11–24 across a continuum of services. The Phoenix Centre for Youth (walk-in hub), Youth Shelter, Learning & Employment Centre, housing programs and Youth Outreach serve ages 16–24; Youth & Family Therapy and the Phoenix Youth & Community Centre (Mulgrave Park) serve ages 11–24. Housing referrals: Phoenix Centre for Youth, 902-420-0676 or pcfy@phoenixyouth.ca.')
set_field('phoenix-youth', 'apply_url', 'https://www.phoenixyouth.ca/ourprograms')

# ---- NSTAY ----
set_field('nstay-ywca', 'age_min', 13); set_field('nstay-ywca', 'age_max', 24)
set_field('nstay-ywca', 'short_description', 'YWCA Halifax support for youth 13–24 of any gender who are, or have been, affected by sexual exploitation or the sex trade — province-wide, self- or agency-referral.')
set_field('nstay-ywca', 'description', 'NSTAY (Nova Scotia Transition and Advocacy for Youth) is a YWCA Halifax program for youth aged 13–24 of any gender identity who are or have been involved in, groomed for, or exploited through the sex trade, anywhere in Nova Scotia. Supports include advocacy, safety planning and the 24-hour staffed Safer Spaces housing in Dartmouth (ages 16–26). Self-referrals and referrals from teachers, social workers and other providers are accepted via the referral forms on the YWCA site (NSTAY@ywcahalifax.com, 782-414-7657). Referrals for youth under 16 go through the Department of Community Services.')

# ---- BBI / Business is Jammin ----
set_field('bbi-initiative', 'name', "BBI — Business is Jammin' Youth Entrepreneurship")
set_field('bbi-initiative', 'age_min', 8); set_field('bbi-initiative', 'age_max', 35)
set_field('bbi-initiative', 'short_description', "Black Business Initiative's youth arm: entrepreneurship camps (ages 8–14), career exploration, STEM bootcamp and leadership summit (14–18), and a networking series for young adults (21–35).")
set_field('bbi-initiative', 'description', "Business is Jammin' (BIJ) is the Black Business Initiative's entrepreneurship and leadership program for African Nova Scotian and Black youth. Programs by age group: March Break and Social Entrepreneurship camps (ages 8–14); Experiences-In career exploration, Role Models on the Road, the STEM Entrepreneurship Summer Bootcamp and the Youth Leadership Summit (ages 14–18, some events 12–18); and a Networking Series for young adults aged 21–35. See businessisjammin.ca/programs for current dates and registration.")
set_field('bbi-initiative', 'apply_url', 'https://businessisjammin.ca/programs/')

# ---- Ready 4 Launch ----
set_field('ywca-ready-4-launch', 'age_min', 15); set_field('ywca-ready-4-launch', 'age_max', 30)
set_field('ywca-ready-4-launch', 'short_description', 'Paid 14-week program for women, gender-diverse and Two-Spirit youth 15–30: 4 weeks of paid readiness workshops + a 10-week paid, supported work placement (30 hrs/wk).')
set_field('ywca-ready-4-launch', 'description', 'Ready 4 Launch is a YWCA Halifax employment program for youth aged 15–30 who identify as women, gender-diverse or Two-Spirit, are legally entitled to work in Nova Scotia (citizen, permanent resident or refugee) and can commit to 30 hours a week. The 14-week model pairs 4 weeks of paid in-class employment-readiness workshops with a 10-week paid, supported work placement; employers are reimbursed for wages. Applications are reviewed on a rolling basis and space is limited. Coordinators: 902-410-8851 / 902-410-4594.')

# ---- ISANS main ----
set_field('isans-main', 'short_description', "Nova Scotia's largest immigrant-serving organization — settlement, language, employment and community programs. Supported 14,500+ newcomers from 170+ countries in 2025–26.")
set_field('isans-main', 'description', 'ISANS (Immigrant Services Association of Nova Scotia) provides settlement, language (LINC and targeted programs), employment, bridging and community-connection services for newcomers, in person and online. Its 2025–26 annual report counts more than 14,500 newcomers supported from over 170 countries, with service available in English and 46+ other languages. Register as a client at isans.ca to access programs.')

# ---- SOPA ----
set_field('isans-sopa', 'description', 'Settlement Online Pre-Arrival (SOPA) is a free, federally funded program delivered by ISANS for people approved to immigrate to Canada who have not yet arrived. Online courses and one-on-one advising cover Canadian workplace culture, job search, and employment planning so you can start your Halifax job search before you land.')
set_field('isans-sopa', 'apply_url', 'https://arriveprepared.ca/')

# ---- Veith House ----
set_field('veith-house', 'neighbourhood', '3115 Veith Street, North End Halifax')
set_field('veith-house', 'description', "Veith House's Newcomers Program offers one-to-one settlement support, beginner (Thursdays 10–1) and intermediate (Wednesdays 10–1) English classes, conversation clubs, academic support for children, a men's activity club, gardening, sewing classes and community outings. Open Monday–Thursday 9–4; contact the Program Coordinator at 902-453-4320.")

# ---- YWCA financial literacy ----
set_field('ywca-financial-literacy', 'name', 'YWCA — Financial Literacy for Newcomers')
set_field('ywca-financial-literacy', 'short_description', 'Free workshops and one-on-one coaching on budgeting, taxes, benefits, credit, loans and banking — in English or French, in person or online.')
set_field('ywca-financial-literacy', 'description', "YWCA Halifax's Financial Literacy for Newcomers Program is free for immigrants, refugees and temporary residents in Nova Scotia. Group workshops and individual financial coaching cover personal and family budgeting, taxes, government benefits, banking, credit cards, loans and home ownership, delivered in English and French, in person or online. Contact flnp@ywcahalifax.com or 902-210-2370.")
set_field('ywca-financial-literacy', 'apply_url', 'https://www.ywcahalifax.com/programs/new-to-canada/financial-literacy/')

# ---- LINC ----
set_field('linc-clic', 'age_min', 16)
set_field('linc-clic', 'short_description', 'Free English classes (CLB 1–8) for ISANS clients — permanent residents, refugee claimants, CUAET holders, AIP applicants and more. Language for Youth stream for ages 16–30.')
set_field('linc-clic', 'description', 'LINC (Language Instruction for Newcomers to Canada) classes at ISANS are free for registered ISANS clients, including permanent residents, Nova Scotia nominees, Atlantic Immigration Program applicants, CUAET visa holders, refugee claimants and Canadian citizens born abroad. Classes run from CLB 1 to 8 after a placement test (CLBPT). Targeted programs include Language for Youth (ages 16–30), classes for seniors, deaf learners, and a Mom & Baby program. Contact lsadmin@isans.ca.')
set_field('linc-clic', 'apply_url', 'https://isans.ca/program/language-instructions-for-newcomers-to-canada-linc-classes/')

# ---- ECE pathway ----
set_field('ece-pathway', 'short_description', 'Tuition-free ECE diploma for newcomers (PR, protected persons, or citizens <5 yrs in Canada) while working 15+ hrs/week in licensed child care — NSCECE (25 months) or NSCC (3.5 years) streams.')
set_field('ece-pathway', 'description', "Nova Scotia's ECE Pathway Programs for newcomers cover tuition, books, fees and language training while participants work at least 15 hours a week in a licensed child-care or pre-primary program. Two part-time online streams: Nova Scotia College of Early Childhood Education (25 months, CLB 7+) and NSCC (3.5 years, CLB 6+). Applicants must be permanent residents, protected persons/refugees, or citizens who have lived in Canada under five years, hold a high-school diploma, and commit to one year (1,080 hours) in the NS early-learning sector after graduating. Priority goes to ISANS clients — contact employment_services@isans.ca.")

# ---- NSNP ----
set_field('ns-nominee-program', 'short_description', 'Provincial PR pathway with 4 streams since Feb 18, 2026: Skilled Worker, Nova Scotia Graduate, Entrepreneur, and Nova Scotia: Express Entry.')
set_field('ns-nominee-program', 'description', "On February 18, 2026 the Nova Scotia Nominee Program consolidated ten pathways into four streams: Skilled Worker (ages 21–55 with a permanent full-time job offer), Nova Scotia Graduate (recent grads 19–55 with a job offer in specific in-demand occupations such as ECE and nurse aide), Entrepreneur, and Nova Scotia: Express Entry. Application fees apply from September 1, 2026. Check liveinnovascotia.com for the current eligibility guides.")
set_field('ns-nominee-program', 'apply_url', 'https://liveinnovascotia.com/nova-scotia-nominee-program')

# ---- UACWA ----
set_field('uacwa-she-matters', 'neighbourhood', '99 Wyse Road, 11th Floor, Dartmouth')
set_field('uacwa-she-matters', 'description', "The United African Canadian Women's Association (founded 1996) runs S.H.E. Matters — Settlement, Health and Entrepreneurship — for immigrant and refugee women and their families: mentorship, orientation workshops, wellness circles, essential-skills and leadership training, business and project-management programs. Funded by NS Labour, Skills and Immigration; the current project runs to 2026. Contact info@uacwa.org.")
set_field('uacwa-she-matters', 'apply_url', 'https://uacwa.org/settlement-health-and-entrepreneurship-s-h-e-matters/')

# ---- Job Junction ----
set_field('job-junction', 'neighbourhood', '7001 Mumford Rd (Halifax Shopping Centre) & Bedford')
set_field('job-junction', 'age_min', 15); set_field('job-junction', 'age_max', 99)
set_field('job-junction', 'short_description', 'Free employment & career resource centre (all ages) at Halifax Shopping Centre and Bedford — workshops, resume help, job listings, and a Friday job-postings email.')
set_field('job-junction', 'description', 'Job Junction is a free employment and career resource centre open to all job seekers, with offices at Suite 200, 7001 Mumford Road (Halifax Shopping Centre) and Suite 721, 1550 Bedford Highway. Hours Monday–Friday 8:30–4:30. Services include resume help, job-search support, workshops and job listings; sign up on jobjunction.ca for the weekly Friday postings email. Job Junction never charges fees and does not contact people via WhatsApp or Telegram. 902-455-9675.')

# ---- Team Work Co-op ----
set_field('team-work-coop', 'short_description', 'Nova Scotia Works employment centre at 7051 Bayers Road, Suite 501 — career planning, resumes, job-search coaching, self-employment support. 902-422-8900.')
set_field('team-work-coop', 'description', 'TEAM Work Cooperative is a Nova Scotia Works Employment Services Centre at 7051 Bayers Road, Suite 501, Halifax (Monday–Friday 8:30–4:30). Job seekers get career planning, resume assistance, job-search coaching, workshops and self-employment support (GO-3D). Phone 902-422-8900; video relay 902-593-0215.')

# ---- SKILL ----
set_field('ns-skill', 'age_min', 17); set_field('ns-skill', 'age_max', 99)
set_field('ns-skill', 'short_description', 'Provincial wage subsidy that funds summer jobs for post-secondary students at NS non-profits — eligibility is by student status and NS residency, not age.')
set_field('ns-skill', 'description', "The Student Summer Skills Incentive (SKILL) funds Nova Scotia non-profits to hire post-secondary students for summer work. Students must be enrolled full-time and returning to (or entering) post-secondary studies in the fall, and be a permanent NS resident or have lived in the province six months (may be waived for international students staying in NS). There is no age cut-off. Students apply directly to participating employers' postings.")

# ---- SWPP ----
set_field('swpp', 'short_description', 'Federal wage subsidy (50% of wages, up to $5,000 per placement as of April 2026) that helps employers hire post-secondary students for work-integrated learning.')
set_field('swpp', 'description', "The Student Work Placement Program reimburses employers 50% of a post-secondary student's wages, to a maximum of $5,000 per placement (the former 70%/$7,000 tier for under-represented students ended April 1, 2026). Employers apply through delivery partners such as Magnet, Technation, BioTalent Canada and ICTC; students benefit by asking prospective employers whether they use SWPP funding.")
set_field('swpp', 'apply_url', 'https://www.canada.ca/en/employment-social-development/services/student-work-placements-wage-subsidies.html')

# stamp everyone
import importlib.util
spec = importlib.util.spec_from_file_location('sd', p)
for m in re.finditer(r'"slug": "([^"]+)"', s[:s.index('JOB_FEEDS = [')]):
    stamp(m.group(1))

open(p, 'w').write(s)
print('ok')
