// Generates scripts/seed-spot-translations-is.sql by pairing each
// production English row (parsed from raw-photos/viewing_spots_rows.sql)
// with a hand-curated Icelandic translation defined inline below.
//
// Run from repo root:
//   node scripts/internal/generate-spot-translations-is.mjs
//
// Why a generator:
//   - 28 spots × 4 prose fields × N warnings is too many strings to
//     keep in sync by hand.
//   - Production English changes occasionally; rerunning the
//     generator after a refresh keeps IS in lock-step.
//   - SQL escaping (single-quote doubling, JSONB casts) is mechanical;
//     better to do it once in code than 28× by hand.

import fs from 'node:fs'

const ROOT = 'D:/Projects/eclipsechase/eclipse-chaser'
const PARSED = `${ROOT}/raw-photos/parsed-spots.json`
const OUT = `${ROOT}/scripts/seed-spot-translations-is.sql`

const en = JSON.parse(fs.readFileSync(PARSED, 'utf8'))
const enBySlug = Object.fromEntries(en.map(r => [r.slug, r]))

// ─────────────────────────────────────────────────────────────────
// IS translations. Keys map to slugs in viewing_spots. Each entry
// carries:
//   name             — short label
//   description      — long-form paragraph
//   parking_info     — single sentence
//   terrain_notes    — single sentence
//   warnings_titles  — array of strings, ONE PER warning in production
//                      (in production order). Levels are pulled from
//                      the production row; we only translate the title.
// ─────────────────────────────────────────────────────────────────
const is = {
  'akranes-lighthouse': {
    name: 'Akranesviti',
    description:
      'Bær á tanga Akranesskagans með vita sem býður 270° útsýni yfir hafið. Vesturströndin er með algjörlega opinn sjóndeildarhring. Stutt heilmyrkvi (nálægt suðurjaðri leiðarinnar) en frábært aðgengi — aðeins 45 mínútna akstur frá Reykjavík um Hvalfjarðargöng.',
    parking_info: 'Frí bílastæði nálægt vitanum og meðfram strandgötunni.',
    terrain_notes: 'Slétt strandsvæði nálægt vitanum. Malbikaðir stígar og malarströnd.',
    warnings_titles: [
      'Aðeins ~1 mínúta heilmyrkvi — en mjög aðgengilegt (45 mín frá Reykjavík um Hvalfjarðargöng)',
      'Bærinn býr yfir fullri þjónustu — veitingastöðum, matvöruverslun og sundlaug',
    ],
  },

  'arnarstapi-coastal-platform': {
    name: 'Arnarstapi — strandstöpullinn',
    description:
      'Stórbrotið strandþorp við rætur Snæfellsjökuls. Sléttur hraunpallur sem teygir sig út í hafið býður upp á víðopinn vestursjóndeildarhring. Hinn frægi sjávarbogi Gatklettur og svartir basaltdrangar mynda dramatíska umgjörð fyrir sólmyrkvann.',
    parking_info: 'Afmörkuð malarbílastæði við upphaf strandgöngustígsins. Frítt, ~60–80 bílar.',
    terrain_notes: 'Sléttur til bylgjóttur hraunpallur. Sumstaðar grýtt undirlag nálægt klettum.',
    warnings_titles: [
      'Vinsæll ferðamannastaður — búast má við miklu fjölmenni á sólmyrkvadegi',
      'Klettabrúnir meðfram strandstígnum eru ógirtar — gættu að börnum og stígðu varlega',
      'Bílastæði eru takmörkuð — íhugaðu að mæta vel fyrir sólmyrkvann',
    ],
  },

  'blue-lagoon': {
    name: 'Bláa lónið',
    description:
      'Frægasti ferðamannastaður Íslands — jarðhitaspaa í svörtu hraunbreiðu á Reykjanesskaga. Í fyrsta sinn í sögu sinni liggur Bláa lónið beint á leið heilmyrkvans. Gestir geta upplifað sólmyrkvann úr hlýju, steinefnaríku vatninu með óhindruðu vestur-suðvestur útsýni yfir hraunbreiðuna.',
    parking_info: 'Stórt bílastæði með pláss fyrir hundruð bíla. Vel skipulagt komu- og brottfararkerfi.',
    terrain_notes: 'Slétt hraunbreiða í um 30 m hæð. Ekkert verulegt landslag í kring. Opinn himinn í allar áttir.',
    warnings_titles: [
      'MIÐAR NAUÐSYNLEGIR — Bláa lónið krefst fyrirframbókaðrar aðgöngu',
      'Sérstakir sólmyrkvamiðar seljast hratt — bókaðu strax',
      'Útsýni yfir sólmyrkvann getur verið takmarkað af spaa-byggingum (gufu, húsum) eftir staðsetningu í lóninu',
      'Verðlag er hátt (forgangsverð fyrir sólmyrkvaviðburðinn)',
    ],
  },

  'breidavik-beach': {
    name: 'Breiðavíkurströnd',
    description:
      'Stórkostleg gulleit sandströnd nálægt Látrabjargi sem snýr í vestur að opnu Atlantshafi. Einn af þeim stöðum á meginlandinu sem liggur næst miðlínu sólmyrkvans. Algjörlega opinn vestursjóndeildarhringur. Engin þjónusta — afskekktur staður sem krefst undirbúnings, en býður á móti einhvers besta sólmyrkvaútsýnis á Íslandi.',
    parking_info: 'Lítið malarbílastæði við ströndina. Frítt.',
    terrain_notes: 'Gulleit sandströnd, slétt og opin. Útsett fyrir Atlantshafsvindum.',
    warnings_titles: [
      'Afskekkt: 2 klst akstur frá Patreksfirði um malarvegi að hluta',
      'Eina þjónustan er Hótel Breiðavík — bókaðu gistingu með góðum fyrirvara',
      'Ekkert farsímasamband — sæktu ónettengd kort fyrir komu',
      'Útsett fyrir Atlantshafsvindum — klæddu þig hlýlega',
    ],
  },

  'budir-black-church': {
    name: 'Búðakirkja (svarta kirkjan)',
    description:
      'Hin táknræna svarta timburkirkja á Búðum stendur á opinni hraunbreiðu með víðu útsýni til vesturs yfir Faxaflóa. Andstæða svörtu kirkjunnar við myrkan sólmyrkvahimininn gerir þennan stað að einum mest myndræna sólmyrkvasjónarhornanna á Íslandi.',
    parking_info: 'Bílastæði við Hótel Búðir og nálægt kirkjunni. Frítt.',
    terrain_notes: 'Opin hraunbreiða með mosa á yfirborði. Sléttur jarðvegur umhverfis kirkjuna.',
    warnings_titles: [
      'Bílastæði Hótels Búða eru fyrir hótelgesti — leggðu meðfram veginum ef stæðið er fullt',
      'Búðakirkja er starfandi kirkja — sýndu virðingu ef messur fara fram',
      'Takmörkuð bílastæði (~20 bílar) — mættu snemma á sólmyrkvadegi',
    ],
  },

  'djupalonssandur-beach': {
    name: 'Djúpalónssandur',
    description:
      'Svört hraunsteinsströnd á vesturodda Snæfellsness, innan þjóðgarðs Snæfellsjökuls. Stutt ganga frá bílastæði í gegnum hraunmyndanir niður á dramatíska ströndina. Snýr beint í vestur — fullkomið fyrir sólmyrkvann. Ein helsta sólmyrkvaperla Snæfellsness.',
    parking_info: 'Malbikað bílastæði við upphaf gönguleiðarinnar. Frítt, salerni á staðnum.',
    terrain_notes: 'Malarstígur í gegnum hraunmyndanir, mild halli niður á ströndina. Sumstaðar ójafnt undirlag.',
    warnings_titles: [
      'Innan þjóðgarðs Snæfellsjökuls — búast má við miklu fjölmenni á sólmyrkvadegi',
      'Engin þjónusta á ströndinni — salerni eingöngu á bílastæðinu',
      'Stutt en grýtt ganga niður á ströndina — farðu í góðum gönguskóm',
      'Strandyfirborðið er svört smásteinaströnd, ekki sandur — taktu með stól eða ábreiðu',
    ],
  },

  'gardur-lighthouse': {
    name: 'Garðskagaviti',
    description:
      'Á nyrsta odda Reykjanesskagans bjóða Garðskagavitinn 270° hafsýn. Tveir vitar (sá gamli frá 1897 og sá nýi) standa á sléttri tá með algjörlega opnum sjóndeildarhring. Frábær eldsneytisstöð fyrir sólmyrkvachasers nálægt Keflavíkurflugvelli, með nokkuð langan heilmyrkva fyrir Reykjanes (~1m 35s).',
    parking_info: 'Frí bílastæði nálægt báðum vitunum. Malbikað stæði.',
    terrain_notes: 'Slétt strandtáh með malbikuðum stígum milli vitanna. Opin og útsett fyrir vindi.',
    warnings_titles: [
      'Mjög vindasamur strandoddi — festu búnað og klæddu þig í vindheldar flíkur',
      'Vinsæll vegna nálægðar við Keflavíkurflugvöll — búast má við fjölmenni',
      'Besti sólmyrkvastaðurinn á Reykjanesi — bílastæði (~40 bílar) gætu fyllst á sólmyrkvadegi',
    ],
  },

  'grotta-lighthouse-reykjavik': {
    name: 'Gróttuviti',
    description:
      'Sjávarhólmi á vesturodda Seltjarnarness í Reykjavík. Opin hafsýn til vesturs án ljósmengunar eða bygginga á sjóndeildarhringnum. Besti sólmyrkvastaður á Reykjavíkursvæðinu, en heilmyrkvinn endist aðeins um 1 mín 6 sek.',
    parking_info: 'Frí bílastæði við inngang Gróttu náttúrufriðlands. ~30 stæði, 5 mínútna ganga að vitanum.',
    terrain_notes: 'Slétt eldfjallaberg og malarströnd. Sjávarfallaslóð getur verið undir vatni — athugaðu sjávarfallatöflu fyrir 12. ágúst.',
    warnings_titles: [
      'Verður EXTREMELY fjölmennt — hugsanlega þúsundir manna af öllu höfuðborgarsvæðinu',
      'Vegurinn út í vitaeyjuna er EINGÖNGU aðgengilegur við fjöru — athugaðu sjávarfallatöflu fyrir 12. ágúst',
      'Bílastæði fyllast mjög snemma — íhugaðu að ganga eða hjóla frá Seltjarnarnesi',
      'Styttri heilmyrkvi (~1m 6s) en á vestlægari stöðum — íhugaðu akstur til Reykjaness fyrir ~1m 40s',
    ],
  },

  'hellissandur-village': {
    name: 'Hellissandur',
    description:
      'Vestasta þorpið á Snæfellsnesi, við rætur Snæfellsjökuls. Opnar útsýnisleiðir til norðurs og vesturs frá útjöðrum þorpsins. Gamla útvarpsstöðin nálægt er kennileiti á svæðinu.',
    parking_info: 'Frí bílastæði í þorpsmiðju og nálægt gömlu útvarpsstönginni.',
    terrain_notes: 'Sléttur jarðvegur með opnu útsýni. Skjólstýrður frá sunnanvindum af Snæfellsjökli.',
    warnings_titles: [
      'Lítið þorp (~380 íbúar) — takmarkað matvöruúrval og gisting',
      'Bókaðu gistingu með góðum fyrirvara — gistirými verða uppseld vikuna fyrir sólmyrkvann',
    ],
  },

  'hellnar-viewpoint': {
    name: 'Hellnar — strandútsýni',
    description:
      'Sögulegt útgerðarþorp á suðurströnd Snæfellsness, tengt Arnarstapa með frægri 2,5 km strandgönguleið. Hellnar bjóða dramatískar bergmyndanir, þar á meðal Gatkletti og strandhellinn Baðstofuna. Aðeins minna fjölmennt en Arnarstapi en með takmörkuð bílastæði.',
    parking_info: 'Lítið bílastæði við endann á veginum að Hellnum. Um 15 bílar. Auka bílastæði á Arnarstapa (2,5 km ganga eftir strandstígnum).',
    terrain_notes: 'Strandþorp í sjávarmáli. Suðlæg strönd með útsýni til SV/V yfir Atlantshaf. Gönguleiðir í gegnum hraun að sjávarhellum og boga.',
    warnings_titles: [
      'Minna og rólegra en Arnarstapi — en líka með minni bílastæði',
      'Fjöruhúsið kaffihús hefur takmarkaða gestamóttöku — gæti lokað snemma á sólmyrkvadegi',
    ],
  },

  'hvalsneskirkja': {
    name: 'Hvalsneskirkja',
    description:
      'Söguleg steinkirkja frá 1887 á opinni suðurströnd Reykjanesskagans, í dramatískum sandöldum og hrauni með algjörlega óhindruðu útsýni til suðurs og vesturs. Skáldið Hallgrímur Pétursson þjónaði hér sem prestur. Kirkjan veitir táknræna umgjörð fyrir sólmyrkvann.',
    parking_info: 'Lítið frítt bílastæði við kirkjuna. Malbikaður aðkeyrsluvegur um Þjóðveg 44 frá Sandgerði.',
    terrain_notes: 'Grasi vaxinn kirkjugarður með malarstígum. Opin strandhraunbreiða með sandöldum og hraun til suðurs og vesturs — algjörlega óhindraður vestursjóndeildarhringur.',
    // Order must match production EN warnings (set by migration 009).
    warnings_titles: [
      'Mjög vindasamur strandstaður — festu búnað og klæddu þig í vindheldar flíkur',
      'Lítið frítt bílastæði við sveitarkirkju — komdu snemma á sólmyrkvadegi, sérstaklega vegna nálægðar við Keflavíkurflugvöll',
      'Reykjanesskagi er enn virkur eldfjallasvæði — athugaðu vegaaðstæður á safetravel.is áður en þú keyrir',
    ],
  },

  'isafjordur-harbour': {
    name: 'Ísafjarðarhöfn',
    description:
      'Hafnarsléttan á Ísafirði býður upp á opinn vestursjóndeildarhring yfir mynni fjarðarins. Sem stærsti bær Vestfjarða sameinar Ísafjörður gott aðgengi við miðlæga staðsetningu á heilmyrkvaleiðinni. Umliggjandi fjöll ramma inn himininn til austurs en skilja eftir vesturátt — það mikilvægasta — algjörlega opna.',
    parking_info: 'Stór almenningsbílastæði á hafnarsléttunni (við Pollinn). Frí, malbikuð.',
    terrain_notes: 'Slétt uppfyllt hafnarland og malbikað kantmúr. Engar hindranir til vesturs.',
    warnings_titles: [
      '⚠️ HÆTTA Á SJÓNDEILDARHRING: Djúpur fjörður með bröttum fjöllum — sólin gæti verið hluthuldin frá sumum stöðum',
      'Bestur staður: hafnarbryggjan eða strandlína sem snýr NV að mynni fjarðarins',
      'Forðastu staði inni í landi — fjöll munu hindra útsýnið frá miðbænum',
      'Íhugaðu akstur til Bolungarvíkur (15 mín) fyrir opnari strandstöðu',
    ],
  },

  'keflavik-asbru-viewpoint': {
    name: 'Keflavíkurflugvöllur (Ásbrú)',
    description:
      'Slétta hraunbreiðan í kringum Keflavíkurflugvöll er ein af opnustu, óhindruðustu landssvæðum Íslands. Ásbrú-svæðið býður slétta opna jörð með skýrum vestursjóndeildarhring út yfir hafið. Þar sem flestir alþjóðlegir gestir koma um KEF gæti þetta verið hentugasti sólmyrkvastaðurinn ef þú lendir á sólmyrkvadegi.',
    parking_info: 'Opin slétt svæði í Ásbrú-hverfinu. Frí óformleg bílastæði.',
    terrain_notes: 'Slétt hraunbreiða þakin mosa og möl. Algjörlega slétt og opið landslag.',
    warnings_titles: [
      'Hagnýtur fremur en fagurfræðilegur staður — fyrrum herstöðvarsvæði',
      'Veldu opið svæði fjarri Ásbrú-byggingum fyrir óhindrað útsýni til vesturs',
      'Hentugasti staðurinn fyrir ferðamenn sem koma eða fara um Keflavíkurflugvöll',
    ],
  },

  'kirkjufell-viewpoint': {
    name: 'Kirkjufell — útsýnisstaður',
    description:
      'Mest myndaða fjall Íslands gerir stórkostlegan bakgrunn fyrir sólmyrkvann. 5 mínútna ganga frá bílastæði að klassíska útsýnisstaðnum með Kirkjufellsfossi í forgrunni og hinu táknræna fjalli sem rís upp í vestri. Vandaðu staðsetninguna — Kirkjufell sjálft gæti hindrað sólina frá sumum stöðum.',
    parking_info: 'Stórt bílastæði við Kirkjufellsfoss. Frítt, malbikað.',
    terrain_notes: 'Vel viðhaldinn malarstígur frá bílastæði að útsýnisstað. Að mestu sléttur.',
    warnings_titles: [
      '⚠️ ATHUGIÐ SJÓNDEILDARHRING: Kirkjufell er nálægt sólarátt — staðsettu þig á vesturhlið útsýnissvæðisins',
      'Sólmyrkvamynd með Kirkjufell í baksýn væri stórbrotin, en krefst nákvæmrar staðsetningar',
    ],
  },

  'latrabjarg-cliffs': {
    name: 'Látrabjarg',
    description:
      'Stærsta fuglabjarg Evrópu, 14 km langt og allt að 440 m hátt, á vestasta odda Íslands. Útsýnisstaðurinn á bjargbrúninni snýr beint í vestur yfir opið Atlantshaf án nokkurrar hindrunar á sjóndeildarhringnum. Að mörgu leyti besti sólmyrkvastaður Vestfjarða — en mjög afskekktur, krefst góðs undirbúnings.',
    parking_info: 'Lítið malarbílastæði við útsýnisstaðinn. Frítt.',
    terrain_notes: 'Grasi vaxin bjargbrún. Haltu þig vel fjarri ógirtum klettabrúnum. Getur verið mjög vindasamt.',
    warnings_titles: [
      'Mjög afskekkt: 2,5 klst akstur frá Patreksfirði um malarveg',
      'Engin þjónusta, ekkert farsímasamband, engin salerni — taktu með allt sem þú þarft',
      'Ekkert skjól fyrir vindi eða regni — klæddu þig í fullkomnar vindheldar flíkur',
      'Klettabrúnir eru ógirtar og hættulega brattar — haltu þig vel fjarri',
      'Mjög takmörkuð bílastæði (~20 bílar) — mættu snemma á sólmyrkvadegi',
    ],
  },

  'londrangar-malarrif': {
    name: 'Lóndrangar / Malarrif',
    description:
      'Tveir dramatískir basaltdrangar — sá hærri 75 metrar og sá lægri 61 metri — standa eins og verðir undan suðvesturströnd Snæfellsness. Þessir eldfjallastólpar eru leifar fornra eldgosa og hluti af Snæfellsjökulsþjóðgarði. Strandstígurinn býður dramatískt útsýni og er einn af myndrænustu sólmyrkvastöðum á Íslandi.',
    parking_info: 'Bílastæði við Lóndrangaútsýnisstaðinn (~20 bílar) og sérstakt bílastæði við gestastofu Malarrifs (~20 bílar). Bæði í stuttri göngufjarlægð frá klettunum.',
    terrain_notes: 'Strandbjargstígur. Snýr SV og opnast í Atlantshaf. Lág hraunbreiða í landi. Gönguleiðir vel viðhaldnar.',
    warnings_titles: [
      'Vinsæll ferðamannastaður — búast má við fjölmenni á sólmyrkvadegi',
      'Klettabrúnir geta verið hálar og hættulegar — haltu þig á merktum stígum',
    ],
  },

  'olafsvik-harbour': {
    name: 'Ólafsvíkurhöfn',
    description:
      'Lítill útgerðarbær á norðurströnd Snæfellsness. Hafnarsvæðið býður slétta útsýnispall með Snæfellsjökul í suðri. Opin hafsýn til norðurs og vesturs.',
    parking_info: 'Frí bílastæði nálægt höfninni og meðfram aðalveginum.',
    terrain_notes: 'Slétt hafnarsvæði og strandvegur. Opnar útsýnisleiðir til norðurs og vesturs.',
    warnings_titles: [
      'Best þjónusti bærinn á norðanverðu Snæfellsnesi — matvöruverslun (Samkaup), veitingastaðir, eldsneyti',
      'Hafnarsvæðið verður líklega aðal samkomustaðurinn — mættu snemma fyrir besta stað',
    ],
  },

  'ondverdarnes-svortuloft': {
    name: 'Öndverðarnes / Svörtuloft',
    description:
      'Vesturoddi Snæfellsnessins — dramatísk klettabrún þar sem svörtu basaltbjörgin Svörtuloft falla í Atlantshafið. Lítill appelsínugulur Skálasnagaviti stendur við klettabrúnina. Þessi staður liggur beint á miðlínu sólmyrkvans og býður allt að 2m 11s heilmyrkva — einn lengsti á Íslandi.',
    parking_info: 'Endi á holóttum malarvegi (15 mín frá Hellissandi). Lítið bílastæði fyrir um 10 bíla. Engin auka stæði. Mættu snemma á sólmyrkvadegi.',
    terrain_notes: 'Slétt klettabrún. Opið Atlantshaf til V/NV/SV. Dramatísk svört sjávarbjörg. Mjög vindasamt — einn af vindasömustu stöðum á Íslandi.',
    warnings_titles: [
      'Mjög vindasamt — festu allan búnað og klæddu þig í vindheldar flíkur',
      'Aðgengi um malarveg (15 mín frá Hellissandi) — aktu hægt',
      'Mjög takmörkuð bílastæði (~10 bílar) — mættu snemma',
      'Engin þjónusta, ekkert farsímasamband, ekkert skjól — taktu með allt sem þú þarft',
      'Klettabrúnir eru ógirtar og hættulega brattar',
    ],
  },

  'patreksfjordur-beach': {
    name: 'Patreksfjarðarströnd',
    description:
      'Patreksfjörður er við ytra svæði Vestfjarða með frábæru aðgengi um Þjóðveg 62. Ströndin býður slétt sandflæmi þar sem fjarðarmunnurinn opnast til vestursuðvesturs. Bærinn hefur eldsneytisstöð og grunnþjónustu, sem gerir hann að hagnýtri bækistöð fyrir sólmyrkvagesti.',
    parking_info: 'Götubílastæði um bæinn eru frí. Slétt grasflöt nálægt höfninni fyrir óformlegt útsýni.',
    terrain_notes: 'Sandströnd og slétt hafnarsvæði. Vesturútsýni yfir fjörðinn óhindrað.',
    warnings_titles: [
      '⚠️ HÆTTA Á SJÓNDEILDARHRING: Fjöll geta hindrað sólina að hluta frá sumum stöðum í bænum',
      'Staðsettu þig á vesturströnd fjarðarins fyrir besta sjónarhorn',
      'Ef sólin er hindruð frá þínum stað, aktu til Breiðavíkur (1 klst vestur) eða Látrabjargs (2,5 klst vestur)',
    ],
  },

  'perlan-reykjavik': {
    name: 'Perlan',
    description:
      'Hið táknræna glerhvelfingahús Reykjavíkur, á Öskjuhlíð fyrir ofan borgina. 360° útsýnispallurinn býður óhindrað útsýni — vestur yfir Faxaflóa að setjandi sól, norður yfir borgina og austur að Esjunni. Hækkar þig upp fyrir þaklínur Reykjavíkur og býður besta sólmyrkvasjónarhorn í borginni sjálfri.',
    parking_info: 'Bílastæði á Öskjuhlíð með pláss fyrir um 100 bíla. Einnig aðgengilegt með strætó og göngu/hjólastígum gegnum Öskjuhlíðarskóginn.',
    terrain_notes: 'Hækkuð staðsetning á hól (~60 m yfir sjávarmáli). Glerútsýnispallur með 360° sjónarhorni. Algjörlega óhindraður vestursjóndeildarhringur yfir hafið. Þéttbýlt umhverfi en hækkað yfir þaklínur.',
    warnings_titles: [
      'Aðgangseyrir áskilinn (Perlan-safnsmiði)',
      'Líklega selur sérstaka sólmyrkvaviðburðamiða — athugaðu á perlan.is',
      'Verður mjög fjölmennt — útsýnispallurinn hefur takmarkaða gestamóttöku',
      'Styttri heilmyrkvi (~1 mín) en á vestlægari stöðum',
      'Bókaðu aðganginn með góðum fyrirvara',
    ],
  },

  'reykjanesta-lighthouse': {
    name: 'Reykjanestáviti',
    description:
      'Suðvesturoddi Íslands með 270° hafsýn — ekkert nema opið Atlantshaf til vesturs, suðurs og norðvesturs. Hámarkar óhindrað útsýni fyrir lágstaðsetta sólmyrkvasólina. Meðal lengsti heilmyrkvi á Reykjanesi (~1m 47s).',
    parking_info: 'Frí malarbílastæði við vegamót Þjóðvegs 425 að vitanum. ~30 bílar.',
    terrain_notes: 'Grýtt hraunhöfði með sléttum svæðum nálægt vitanum. Mælt með góðum gönguskóm.',
    warnings_titles: [
      '⚠️ VIRKT ELDGOSASVÆÐI: Athugaðu eldgosastöðu á safetravel.is fyrir heimsókn',
      'Vegir að vitanum gætu verið lokaðir vegna eldgosa á Sundhnúkagígaröðinni',
      'Engin þjónusta við vitann — taktu með birgðir',
      'Grýtt hraunlandslag — farðu í góðum gönguskóm',
    ],
  },

  'rif-harbour-snaefellsnes': {
    name: 'Rif — höfn',
    description:
      'Útgerðarþorpið Rif á norðurströnd Snæfellsness býður opna hafsýn til norðvesturs frá hafnarsléttunni. Snæfellsjökull rís í suðri sem dramatískur bakgrunnur. Innan við 5 mínútna akstri frá Hellissandi og helstu sólmyrkvastöðum á vesturodda Snæfellsness.',
    parking_info: 'Slétt malarbílastæði á hafnarsvæðinu með nóg pláss. Frítt.',
    terrain_notes: 'Slétt malarbryggja og opin jörð. Þétt möl og steypa.',
    warnings_titles: [
      'Mjög lítið þorp (~100 íbúar) — afar takmörkuð gisting',
      'Frystihúsið (The Freezer Hostel) gæti haldið sólmyrkvaviðburði — athugaðu fyrirfram',
    ],
  },

  'saxholl-crater': {
    name: 'Saxhóll',
    description:
      'Gjallgígur með vel viðhaldnum málmstiga (~400 þrep) sem leiðir upp á barminn. 360° víðsýni frá toppnum nær yfir Snæfellsjökul, Atlantshafið og umliggjandi hraunbreiður. Hækkun (~110 m) hjálpar til að lyfta sjóndeildarhringnum og getur einnig veitt einstakt sjónarhorn á 360° sólarlagsáhrifin sem heilmyrkvinn skapar.',
    parking_info: 'Malarbílastæði við rætur gígsins. Frítt.',
    terrain_notes: 'Málmstigi upp á barminn vel viðhaldinn. Getur verið vindasamt á toppnum.',
    warnings_titles: [
      'Mjög vindasamt á gígbarminum — festu allan búnað og myndavélar',
      'Mjög takmörkuð bílastæði (~15 bílar við gígrót) — mættu snemma',
      'Málmstiginn (~400 þrep) getur verið hál þegar blautt',
      'Ekkert skjól eða þjónusta við gíginn',
    ],
  },

  'sky-lagoon': {
    name: 'Sky Lagoon',
    description:
      'Nýtísku jarðhitaspaa með óendalegri laug á vestjaðri höfuðborgarsvæðisins, sérstaklega hannað með hafsnúandi óendalegri brún sem snýr að Faxaflóa í vestur. Hönnunin liggur vel að sólmyrkvann — gestir geta upplifað hann úr lauginni með óhindruðu vestursjóndeildarhring. Aðgengilegra en Bláa lónið frá miðborg Reykjavíkur.',
    parking_info: 'Vandað bílastæði við Sky Lagoon. Nóg pláss. Einnig aðgengilegt með almenningsstrætó frá miðborg Reykjavíkur.',
    terrain_notes: 'Hafsnúandi aðstaða í sjávarmáli. Brún óendalegrar laugar snýr beint í vestur yfir Faxaflóa. Algjörlega óhindraður vestursjóndeildarhringur.',
    warnings_titles: [
      'MIÐAR NAUÐSYNLEGIR — Sky Lagoon krefst fyrirframbókaðrar aðgöngu',
      'Líklega selur sérstaka sólmyrkvaviðburðamiða — athugaðu á skylagoon.com',
      'Mjög takmörkuð gestamóttöku — bókaðu mjög snemma',
      'Stysti heilmyrkvi á listanum okkar (~58s) — þú skiptir lengd fyrir einstaka upplifun',
      'Búast má við hærra verðlagi á sólmyrkvaviðburðinum',
    ],
  },

  'snaefellsjokull-summit': {
    name: 'Snæfellsjökull — toppur',
    description:
      'Hið táknræna 1.446 m jökulhetta lagða eldfjall úr ferð Jules Verne að miðju jarðar. Toppurinn býður hæsta sjónarhornið á Snæfellsnesi með 360° útsýni. MIKILVÆGT: Krefst leiðsöguferðar á jökul með brodda og ísxa. Aðeins fyrir reynda fjallgöngufólk.',
    parking_info: 'Bílastæði við endann á F570-veginum nálægt jökuljaðri. 4WD nauðsynlegt.',
    terrain_notes: 'Aðferð að jökli yfir ís og snjó. Sprungnahætta. Leiðsögumaður nauðsynlegur.',
    warnings_titles: [
      '⚠️ AÐEINS FYRIR REYNDA FJALLGÖNGUFÓLK: Krefst leiðsögu með brodda og ísxa',
      '5–8 klst hringferð — verður að byrja mjög snemma til að ná toppinum fyrir sólmyrkvann (17:45 UTC)',
      'Skýjahætta er HÆRRI í 1.446 m hæð en í sjávarmáli — þú gætir gengið inn í þoku og misst af sólmyrkvanum',
      'Veður mjög óútreiknanlegt í toppshæð — vindur, lágt hitastig, hvítblinda möguleg',
      'Leiðsöguferðir á jökul verður að bóka með góðum fyrirvara',
    ],
  },

  'stykkisholmur-harbour-hill': {
    name: 'Stykkishólmur — hafnarhæðin',
    description:
      'Stærsti bær á Snæfellsnesi, við Breiðafjörð. Klettahæðin Súgandisey býður 360° útsýni, þar á meðal skýrt vestursjóndeildarhring yfir eyjadreifðan flóann. Frábær þjónusta og gisting gera Stykkishólm að besta þéttbýla sólmyrkvabækistöðinni á svæðinu.',
    parking_info: 'Bílastæði í miðbænum eru frí. Bílastæði við höfnina með göngu að Súgandisey.',
    terrain_notes: 'Klettahæð úr basalti (~20 m) með stigum. Slétt útsýnispall á toppnum. Höfnin neðan við er fullkomlega malbikuð.',
    warnings_titles: [
      'Best þjónusti bærinn á Snæfellsnesi — hótel, veitingastaðir, matvörur, Baldur-ferja',
      'Styttri heilmyrkvi en á vestlægari stöðum á Snæfellsnesi — viðskipti er framúrskarandi þjónusta',
      'Gakk upp á Súgandisey fyrir besta hækkaða útsýnisstaðinn',
    ],
  },

  'svodufoss-waterfall': {
    name: 'Svöðufoss',
    description:
      'Myndrænn 10 metra foss sem fellur yfir stórbrotna stuðlabergsbjargi á norðurhlið Snæfellsness. Sérstaklega mælt með af eclipse2026.is sem tilvalinn forgrunn fyrir sólmyrkvaljósmyndun. Stór steypuverk + ægileg jarðfræði + stutt heilmyrkva = einstök sólmyrkvasamsetning.',
    parking_info: 'Lítið hliðarstæði meðfram veginum. Um 10 bílar. Auðvelt að missa af — leitaðu að litlu skilti.',
    terrain_notes: 'Stutt ganga frá veginum að útsýnisstaðnum við fossinn. Slétt til lítillega hallandi. Útsýnissvæðið er með opnu útsýni til vesturs yfir akrana og að ströndinni.',
    warnings_titles: [
      'Mjög takmörkuð bílastæði — mættu snemma eða gakktu frá Ólafsvík',
      'Engin þjónusta við fossinn',
      'Fossinn sjálfur er lítill (10 m) — aðdráttaraflið er stuðlabergsbjargi á bak við hann',
    ],
  },

  'ytri-tunga-beach': {
    name: 'Ytri Tunga',
    description:
      'Einn besti staðurinn á Íslandi til að sjá selalegur — selir liggja reglulega á klettum rétt undan landi, sérstaklega á sumrin. Ólíkt flestum íslenskum ströndum hefur Ytri Tunga gulleitan sand frekar en svartan, sem skapar mjúkt og litríkt forgrunn fyrir sólmyrkvaljósmyndir með dramatísku himinhvelfingunni.',
    parking_info: 'Lítið bílastæði við aðgangsstaðinn að ströndinni. Um 15 bílar. Stutt ganga niður á ströndina.',
    terrain_notes: 'Slétt gulleit sandströnd á suðurströnd. Opið útsýni til V/SV yfir Faxaflóa. Lágt landslag, engar hindranir.',
    warnings_titles: [
      'Styttri heilmyrkvi (~1m 25s) en á norðanverðu Snæfellsnesi',
      'Haltu fjarlægð frá selum — ekki nálgast eða raska þeim (íslensk lög)',
      'Engin þjónusta við ströndina',
    ],
  },
}

// ─────────────────────────────────────────────────────────────────
// SQL builders.
// ─────────────────────────────────────────────────────────────────
function escSql(s) {
  return s.replace(/'/g, "''")
}

function quote(s) {
  return s == null ? 'NULL' : `'${escSql(s)}'`
}

// Re-emit the warnings JSONB by pulling levels (and any non-empty
// bodies) from production EN, then substituting translated titles.
function buildWarnings(prodWarningsJsonStr, isTitles) {
  if (!prodWarningsJsonStr || prodWarningsJsonStr === '[]') return 'NULL::jsonb'
  const arr = JSON.parse(prodWarningsJsonStr)
  if (arr.length === 0) return 'NULL::jsonb'
  if (arr.length !== isTitles.length) {
    throw new Error(`Title count mismatch: ${arr.length} prod warnings vs ${isTitles.length} IS titles`)
  }
  const items = arr.map((w, i) => ({
    level: w.level,
    title: isTitles[i],
    body: w.body || '',
  }))
  return `'${escSql(JSON.stringify(items))}'::jsonb`
}

// Sanity: every production slug must have an IS entry.
const prodSlugs = en.map(r => r.slug).sort()
const isSlugs = Object.keys(is).sort()
const missing = prodSlugs.filter(s => !isSlugs.includes(s))
const extra = isSlugs.filter(s => !prodSlugs.includes(s))
if (missing.length || extra.length) {
  console.error('Coverage mismatch:')
  if (missing.length) console.error('  missing IS for:', missing)
  if (extra.length) console.error('  extra IS for:', extra)
  process.exit(1)
}

// Build the VALUES tuples in production order for stable diffs.
const tuples = en.map(row => {
  const t = is[row.slug]
  const warnings = buildWarnings(row.warnings, t.warnings_titles)
  return `    (
      ${quote(row.slug)}, 'is',
      ${quote(t.name)},
      ${quote(t.description)},
      ${quote(t.parking_info)},
      ${quote(t.terrain_notes)},
      ${warnings}
    )`
})

const sql = `-- Icelandic translations for curated viewing spots.
--
-- Run AFTER migration 008-spot-translations.sql.
-- Re-running this script is safe — it acts as an upsert via
-- ON CONFLICT (spot_slug, locale) DO UPDATE.
--
-- Skips-missing-FK pattern: this script bundles every Icelandic
-- translation row into a single INSERT … SELECT … WHERE EXISTS, so
-- any row whose spot doesn't exist in viewing_spots is silently
-- dropped instead of throwing an FK violation. Safe to run on a
-- partially-seeded environment.
--
-- THIS FILE IS GENERATED by scripts/internal/generate-spot-translations-is.mjs
-- from raw-photos/parsed-spots.json (which is parsed from the latest
-- production INSERT in raw-photos/viewing_spots_rows.sql). To refresh:
--   1. Export viewing_spots from Supabase → raw-photos/viewing_spots_rows.sql
--   2. node scripts/internal/parse-spots.mjs       (regenerates parsed-spots.json)
--   3. node scripts/internal/generate-spot-translations-is.mjs
-- Don't hand-edit this file directly — edit the generator's IS map.
--
-- Coverage: ${en.length} spots, matching production exactly.
-- Translation notes:
--   • Icelandic place names are kept (Snæfellsjökull, Vestfirðir,
--     Reykjavík, Reykjanesskagi, Borgarfjörður).
--   • Eclipse vocabulary follows established Icelandic usage:
--     heilmyrkvi (totality), heilsólmyrkvi (total eclipse),
--     deildarmyrkvi (partial), kóróna, sjóndeildarhringur, sólhæð.
--   • Translations are machine-quality but follow native idiom
--     where possible. Recommend a native review pass before launch
--     for the longer paragraphs.

WITH translations(spot_slug, locale, name, description, parking_info, terrain_notes, warnings) AS (
  VALUES
${tuples.join(',\n')}
)
INSERT INTO viewing_spot_translations (
  spot_slug, locale, name, description, parking_info, terrain_notes, warnings
)
SELECT t.spot_slug, t.locale, t.name, t.description, t.parking_info, t.terrain_notes, t.warnings
FROM translations t
WHERE EXISTS (SELECT 1 FROM viewing_spots vs WHERE vs.slug = t.spot_slug)
ON CONFLICT (spot_slug, locale) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  parking_info  = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  warnings      = EXCLUDED.warnings,
  updated_at    = NOW();
`

fs.writeFileSync(OUT, sql, 'utf8')
console.log(`Wrote ${OUT}`)
console.log(`  ${en.length} spots, ${tuples.length} INSERT tuples`)
