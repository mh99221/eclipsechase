-- Icelandic translations for curated viewing spots.
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
-- Coverage as of this revision (28 spots, matching production):
--   Westfjords:     isafjordur, patreksfjordur, breidavik, latrabjarg
--   Snæfellsnes:    rif, arnarstapi, stykkisholmur, olafsvik,
--                   hellissandur, hellnar, budir, kirkjufell,
--                   djupalonssandur, saxholl, snaefellsjokull,
--                   londrangar-malarrif, ondverdarnes-svortuloft,
--                   svodufoss, ytri-tunga
--   Reykjavík:      grotta, perlan, sky-lagoon
--   Reykjanes:      reykjanesta, keflavik, hvalsneskirkja, gardur,
--                   blue-lagoon
--   Borgarfjörður:  akranes
--
-- Translation notes:
--   • Icelandic place names are kept (Snæfellsjökull, Vestfirðir,
--     Reykjavík, Reykjanesskagi, Borgarfjörður).
--   • Eclipse vocabulary follows established Icelandic usage:
--     heilmyrkvi (totality), heilsólmyrkvi (total eclipse),
--     deildarmyrkvi (partial), kóróna, sjóndeildarhringur,
--     sólhæð, azimút.
--   • Translations are machine-quality but follow native idiom
--     where possible. Recommend a native review pass before launch
--     for the longer paragraphs.

WITH translations(spot_slug, locale, name, description, parking_info, terrain_notes, warnings) AS (
  VALUES
    -- ─── WESTFJORDS ───
    (
      'isafjordur-harbour', 'is',
      'Ísafjarðarhöfn',
      'Hafnarsléttan á Ísafirði býður upp á opinn vestursjóndeildarhring yfir mynni fjarðarins. Sem stærsti bær Vestfjarða sameinar Ísafjörður gott aðgengi við miðlæga staðsetningu á heilmyrkvaleiðinni. Umliggjandi fjöll ramma inn himininn til austurs en skilja eftir vesturátt — það mikilvægasta — algjörlega opna.',
      'Stór almenningsbílastæði á hafnarsléttunni (við Pollinn). Frí, malbikuð.',
      'Slétt uppfyllt hafnarland og malbikað kantmúr. Engar hindranir til vesturs.',
      NULL::jsonb
    ),
    (
      'patreksfjordur-beach', 'is',
      'Patreksfjarðarströnd',
      'Patreksfjörður er við ytra svæði Vestfjarða með frábæru aðgengi um Þjóðveg 62. Ströndin býður slétt sandflæmi þar sem fjarðarmunnurinn opnast til vestursuðvesturs. Bærinn hefur eldsneytisstöð og grunnþjónustu, sem gerir hann að hagnýtri bækistöð fyrir sólmyrkvagesti.',
      'Götubílastæði í gegnum bæinn er ókeypis. Slétt graslendi nálægt höfninni fyrir óformlega áhorfun.',
      'Sandströnd og slétt hafnarsvæði. Vestursýn fjarðarins óhindruð.',
      NULL::jsonb
    ),
    (
      'breidavik-beach', 'is',
      'Breiðavíkurströnd',
      'Stórbrotin gylt sandströnd nálægt Látrabjargi, sem horfir í vestur yfir opið Atlantshaf. Einn af þeim stöðum á meginlandinu sem eru næst miðlínu sólmyrkvans. Algjörlega óhindraður vestursjóndeildarhringur. Engin þjónusta — taktu með þér allt sem þú þarft.',
      'Lítið malarbílastæði við ströndina. Frítt.',
      'Gylt sandströnd, slétt og opin. Opin fyrir Atlantshafsvindum.',
      '[
         {"level":"warn","title":"Afskekkt: 2 klst akstur frá Patreksfirði um malar­vegi að hluta","body":""},
         {"level":"warn","title":"Eina þjónustan er Hótel Breiðavík — bókaðu gistingu með góðum fyrirvara","body":""},
         {"level":"warn","title":"Ekkert farsímasamband — sæktu ónettengd kort fyrir komu","body":""}
       ]'::jsonb
    ),
    (
      'latrabjarg-cliffs', 'is',
      'Látrabjarg',
      'Stærsta fuglabjarg Evrópu, 14 km langt og allt að 440 m hátt, á vestasta odda Íslands. Útsýnisstaður á bjargbrúninni snýr beint til vesturs yfir opið Atlantshaf, með núll hindrun í sjóndeildarhring. Um miðjan ágúst geta lundar enn verið á svæðinu. Afskekktin þýðir núll ljósmengun ef ský hverfa. 2+ klst akstur frá Patreksfirði um malar­vegi.',
      'Lítið malarbílastæði við útsýnisstaðinn. Frítt.',
      'Graslendi á bjargbrúninni. Haltu þig vel fjarri ógirtum bjargbrúnum. Getur verið mjög hvasst.',
      '[
         {"level":"bad","title":"Bjargbrúnir eru ógirtar og hættulega bratta — haltu þig vel fjarri","body":""},
         {"level":"warn","title":"Mjög afskekkt: 2,5 klst akstur frá Patreksfirði á malar­vegi","body":""},
         {"level":"warn","title":"Engin þjónusta, ekkert farsímasamband, engin salerni — taktu með þér allt sem þú þarft","body":""},
         {"level":"warn","title":"Ekkert skjól fyrir vindi eða regni — klæddu þig í fullan vindheldan búnað","body":""},
         {"level":"warn","title":"Mjög takmörkuð bílastæði (~20 bílar) — komdu snemma á sólmyrkvadaginn","body":""}
       ]'::jsonb
    ),

    -- ─── SNÆFELLSNES ───
    (
      'rif-harbour-snaefellsnes', 'is',
      'Rifshöfn',
      'Sjávarþorpið Rif á norðurströnd Snæfellsness býður opna sjónaratursýn í norðvestur frá hafnarsléttunni. Snæfellsjökull rís í suðri sem stórbrotin baksvið. Innan miðju sólmyrkvaslóðar með opnum sjóndeildarhring fyrir lágstæða heilmyrkvasól.',
      'Slétt malarhafnarsvæði með nóg af óformlegum bílastæðum. Frítt.',
      'Slétt malarhafnarbryggja og opið undirlag. Stöðug möl og steinsteypa.',
      '[
         {"level":"warn","title":"Mjög lítið þorp (~100 íbúar) — afar takmörkuð gistirými","body":""}
       ]'::jsonb
    ),
    (
      'arnarstapi-coastal-platform', 'is',
      'Arnarstapi — strandhilla',
      'Stórbrotið strandþorp við rætur Snæfellsjökuls. Slétta hraunhillan sem teygist út í hafið veitir víðan opinn vestursjóndeildarhring. Frægi sjávarboginn Gatklettur og svartir basaltdrangar skapa stórfengilegt umhverfi fyrir sólmyrkvaeftirlit.',
      'Tileinkað malarbílastæði við byrjun strandgöngunnar. Frítt, ~60–80 bílar.',
      'Slétt eða hægbylgjandi hraunhilla. Sums staðar grýtt undirlag við klettana.',
      '[
         {"level":"bad","title":"Bjargbrúnir meðfram strandgöngunni eru ógirtar — fylgstu með börnum og stígðu varlega","body":""},
         {"level":"warn","title":"Vinsæll ferðamannastaður — búast má við miklum mannfjölda á sólmyrkvadaginn","body":""},
         {"level":"warn","title":"Bílastæði takmörkuð — íhugaðu að koma vel á undan myrkvatíma","body":""}
       ]'::jsonb
    ),
    (
      'stykkisholmur-harbour-hill', 'is',
      'Stykkishólmur — Hafnarhæð',
      'Stærsti bær Snæfellsness, staðsettur við Breiðafjörð. Klettahæðin Súgandisey gefur 360° útsýni þar með talinn skýran vestursjóndeildarhring yfir eyjastráðan flóann. Frábær þjónusta með hótel, veitingastöðum og eldsneyti.',
      'Bílastæði í bænum eru ókeypis. Bílastæði nálægt höfninni með göngusamböndum að Súgandisey.',
      'Klettóttur basalthóll (~20 m) með tröppum. Slétt áhorfsstétt á tindinum. Höfnin fyrir neðan er fullmalbikuð.',
      NULL::jsonb
    ),
    (
      'olafsvik-harbour', 'is',
      'Ólafsvíkurhöfn',
      'Lítill útgerðarbær á norðurströnd Snæfellsness. Hafnarsvæðið býður slétta áhorfsstétt þar sem Snæfellsjökull rís í suðri. Opið sjónarútsýni til norðurs og vesturs.',
      'Frítt bílastæði nálægt höfninni og meðfram aðalveginum.',
      'Slétt hafnarsvæði og strandvegur. Opið útsýni til norðurs og vesturs.',
      '[
         {"level":"warn","title":"Hafnarsvæðið verður líklega aðal samkomustaður — komdu snemma fyrir góða stöðu","body":""}
       ]'::jsonb
    ),
    (
      'hellissandur-village', 'is',
      'Hellissandur',
      'Vestasta þorp Snæfellsness, við rætur Snæfellsjökuls. Opið útsýni til norðurs og vesturs frá útjaðri þorpsins. Gamla útvarpsmastrið nálægt er staðbundið kennileiti.',
      'Frítt bílastæði í þorpsmiðju og nálægt gamla útvarpsmastri.',
      'Slétt undirlag með opnu útsýni. Skýlt fyrir suðanvindum af Snæfellsjökli.',
      '[
         {"level":"warn","title":"Lítið þorp (~380 íbúar) — takmarkað matarval og gisting","body":""},
         {"level":"warn","title":"Bókaðu gistingu með góðum fyrirvara — gistirými seljast upp í myrkvavikunni","body":""}
       ]'::jsonb
    ),
    (
      'hellnar-viewpoint', 'is',
      'Hellnar — strandútsýnisstaður',
      'Sögufrægt sjávarþorp við rætur Snæfellsjökuls, beint suður af Arnarstapa. Strandgangan milli þorpanna liggur eftir grýttri lágklettalínu með stórbrotnum sjávarbogum og hellum. Hellnar sjálft hefur mikinn opinn vestursjóndeildarhring yfir opnu hafi — fullkomin samstilling fyrir lágstæða heilmyrkvasól. Þorpið er innan Þjóðgarðsins Snæfellsjökuls.',
      'Frítt malarbílastæði við sjávarmegin þorpsins, nálægt gamla þorpshúsinu.',
      'Grasi vaxið flæmi með berum klettaröðum. Grýttur og ósléttur strandstígur niður að fjörunni.',
      '[
         {"level":"bad","title":"Klettar við ströndina eru ógirtir — vertu varlegur, sérstaklega með börn","body":""},
         {"level":"warn","title":"Innan Þjóðgarðsins Snæfellsjökuls — búast má við töluverðum mannfjölda á sólmyrkvadaginn","body":""},
         {"level":"warn","title":"Þorpið er pínulítið — engin lengri þjónusta, takmörkuð gisting","body":""}
       ]'::jsonb
    ),
    (
      'budir-black-church', 'is',
      'Búðakirkja',
      'Hin táknræna svarta timburkirkja á Búðum stendur á opnum hraunfláka með víðu útsýni til vesturs yfir Faxaflóa. Sterkt mótvægi svartrar kirkjunnar við myrkvaðan sólmyrkvahimin gerir þetta að draumastað ljósmyndara. Hótel Búðir veitir glæsiþjónustu nálægt.',
      'Bílastæði við Hótel Búðir og nálægt kirkjunni. Frítt.',
      'Opinn hraunfláki með mosakenndu undirlagi. Slétt landslag í kringum kirkjuna.',
      '[
         {"level":"warn","title":"Takmörkuð bílastæði (~20 bílar) — komdu snemma á sólmyrkvadaginn","body":""}
       ]'::jsonb
    ),
    (
      'kirkjufell-viewpoint', 'is',
      'Kirkjufell — útsýnisstaður',
      'Mest myndaða fjall Íslands gerir stórkostlegt sólmyrkvabaksvið. 5 mínútna gangur frá bílastæði að klassíska útsýnisstaðnum með Kirkjufellsfoss í forgrunni og hinn táknræna örvarodd í baksýn. Heilmyrkvi sem útlínar Kirkjufell verður ógleymanlegur.',
      'Stór bílastæði við Kirkjufellsfoss. Frítt, malbikað.',
      'Vel viðhaldinn malarstígur frá bílastæði að útsýnisstað. Að mestu sléttur.',
      NULL::jsonb
    ),
    (
      'djupalonssandur-beach', 'is',
      'Djúpalónssandur',
      'Svört hraunmölströnd á vesturodda Snæfellsness, innan Þjóðgarðsins Snæfellsjökuls. Stuttur gangur frá bílastæði í gegnum hraunmyndanir niður á dramatíska ströndina. Snýr beint til vesturs — fullkomin samstilling fyrir myrkvaða sólina við 249° azimút. Salerni við bílastæði.',
      'Malbikað bílastæði við gönguupphafið. Frítt, salerni til staðar.',
      'Malarstígur í gegnum hraunmyndanir, hægur niðurganga á strönd. Sums staðar ójafnt undirlag.',
      '[
         {"level":"warn","title":"Innan Þjóðgarðsins Snæfellsjökuls — búast má við töluverðum mannfjölda á sólmyrkvadaginn","body":""}
       ]'::jsonb
    ),
    (
      'saxholl-crater', 'is',
      'Saxhóll',
      'Gjallhóll með vel viðhaldnu málm­tröppustigi (~400 þrep) sem leiðir upp á barminn. 360° víðsýni frá tindinum nær yfir Snæfellsjökul, Atlantshafið og umliggjandi hraunfláka. Að horfa á heilmyrkvann innan úr eldfjallagjá er einstök upplifun.',
      'Malarbílastæði við rætur hólsins. Frítt.',
      'Málmtröppustigi upp á barminn er vel viðhaldinn. Getur verið hvasst á tindinum.',
      '[
         {"level":"warn","title":"Mjög vindberskjölduð á gjárbarminum — festu allan búnað og myndavélar","body":""},
         {"level":"warn","title":"Mjög takmörkuð bílastæði (~15 bílar við gjárrót) — komdu snemma","body":""},
         {"level":"warn","title":"Málmtröppustiginn (~400 þrep) getur verið háll í bleytu","body":""}
       ]'::jsonb
    ),
    (
      'snaefellsjokull-summit', 'is',
      'Snæfellsjökull — tindur',
      'Hin táknræna 1.446 m jökulkrónaða eldkeila úr Ferð inn í iður jarðarinnar eftir Jules Verne. Tindurinn býður hæsta sjónarhornið á Snæfellsnesi með 360° útsýni. MIKILVÆGT: Jökulganga krefst broddanna, ísaxar og leiðsögumanns. Veður getur breyst hratt. Ekki ráðlegt án faglegs fjallabúnaðarstuðnings.',
      'Bílastæði við endann á F570 nálægt jökuljaðri. 4WD nauðsynlegt.',
      'Jökulnálgun yfir ís og snjó. Sprunguhætta. Faglegur leiðsögumaður skylda.',
      '[
         {"level":"bad","title":"⚠️ AÐEINS REYNDIR FJALLAGÖNGUMENN: Krefst leiðsöguferðar á jökul með brodda og ísaxar","body":""},
         {"level":"bad","title":"5–8 klst gönguferð fram og til baka — verður að byrja mjög snemma til að ná tindi fyrir myrkva (17:45 UTC)","body":""},
         {"level":"bad","title":"Skýjahætta er HÆRRI í 1.446 m hæð en við sjávarmál — þú gætir gengið inn í þoku og misst af myrkvanum alveg","body":""},
         {"level":"bad","title":"Veður mjög ófyrirsjáanlegt í tindarhæð — sterkur vindur, lágt hitastig, snjóblinda möguleg","body":""},
         {"level":"warn","title":"Leiðsöguferðir á jökul verða að bóka með góðum fyrirvara","body":""}
       ]'::jsonb
    ),
    (
      'londrangar-malarrif', 'is',
      'Lóndrangar / Malarrif',
      'Tveir gríðarstórir basaltdrangar sem rísa beint upp úr sjónum á suðurströnd Snæfellsness, innan Þjóðgarðsins Snæfellsjökuls. Ekki langt frá Malarrifsvita býður útsýnisstaðurinn dramatískt sjónarhorn beint yfir opið Atlantshaf til vesturs og suðurs. Innan miðju sólmyrkvaslóðar með opnum lágum sjóndeildarhring — skugginn af heilmyrkvanum mun draga sjávardrangana í hárfínar útlínur.',
      'Malbikað bílastæði við Malarrifsvita. Frítt, ~40 bílar.',
      'Slétt graslendi og hraunfláki að útsýnisstaðnum. Berskjaldað fyrir vindi af hafi.',
      '[
         {"level":"bad","title":"Klettabrúnir eru ógirtar — haltu þig vel fjarri brúninni","body":""},
         {"level":"warn","title":"Innan Þjóðgarðsins Snæfellsjökuls — búast má við töluverðum mannfjölda","body":""},
         {"level":"warn","title":"Mjög vindberskjaldað strandsvæði — klæddu þig í vindheldan búnað","body":""}
       ]'::jsonb
    ),
    (
      'ondverdarnes-svortuloft', 'is',
      'Öndverðarnes / Svörtuloftaviti',
      'Vestasti oddi Snæfellsness með litlum vita á dramatískum hraunhöfða. Algjörlega óhindraður vestursjóndeildarhringur yfir opnu Atlantshafi — eitt af áreiðanlegustu lágum sjóndeildarhringum á Íslandi fyrir lágstæða heilmyrkvasól. Aðkoman er um malar- og hraunslóða, krefst varkárs aksturs.',
      'Lítið malarbílastæði nálægt vitanum. Frítt.',
      'Klettóttur hraunhöfði. Hrafn­tinnusvört og hvöss undirlag — sterkir gönguskór mælt með.',
      '[
         {"level":"warn","title":"Aðkoma um malar- og hraunslóða — 4WD eða hárlaust hjólhús betur til þess fallið","body":""},
         {"level":"warn","title":"Mjög afskekkt og berskjaldað fyrir Atlantshafsvindum — engin skjól","body":""},
         {"level":"warn","title":"Engin þjónusta, ekkert farsímasamband — taktu með þér birgðir","body":""}
       ]'::jsonb
    ),
    (
      'svodufoss-waterfall', 'is',
      'Svöðufoss',
      'Þrep­myndaður foss þar sem Laxá á Snæfellsnesi steypist niður um basaltsúlur, með Snæfellsjökul í baksýn. Stutt malbikuð gönguleið frá bílastæði að útsýnispalli. Innlandsstaður með vestursjóndeildarhringinn rammaðan af jöklinum — ekki eins opinn og strönd­in en verulega dramatísk umgjörð fyrir sólmyrkvaeftirlit.',
      'Lítið malarbílastæði nálægt fossinum. Frítt, ~30 bílar.',
      'Slétt graslendi og malbikaður útsýnispallur. Aðkoman er sléttur stígur með nokkrum stigaprepum.',
      '[
         {"level":"warn","title":"Útsýnispallurinn er nálægt fossbrúninni — fylgstu með börnum","body":""},
         {"level":"warn","title":"Bílastæði takmörkuð — komdu snemma á sólmyrkvadaginn","body":""}
       ]'::jsonb
    ),
    (
      'ytri-tunga-beach', 'is',
      'Ytri Tunga — selabaðstrand',
      'Gylt sandströnd á suðurströnd Snæfellsness, fræg fyrir landselina sem hvíla sig á klettunum við lágflóð. Strendurnar opnast til suðurs og vesturs — gott opið sjónarsvið yfir Faxaflóa. Þægilega nálægt Þjóðvegi 54, sem gerir staðinn að einum aðgengilegasta strandvalkostinum á Snæfellsnesi fyrir sólmyrkvaeftirlit.',
      'Frítt malarbílastæði við ströndina, ~30 bílar.',
      'Slétt sand- og malarströnd. Klettar þar sem selir hvíla — haltu þig fjarri þeim svo þú trufflir ekki dýrin.',
      '[
         {"level":"info","title":"Selir hvíla sig á klettunum við lágflóð — fylgstu úr 50 m fjarlægð","body":""},
         {"level":"warn","title":"Bílastæði takmörkuð — komdu snemma á sólmyrkvadaginn","body":""}
       ]'::jsonb
    ),

    -- ─── BORGARFJÖRÐUR ───
    (
      'akranes-lighthouse', 'is',
      'Akranesviti',
      'Bær á tánni á Akranestanga með vita sem býður 270° sjónarútsýni. Vesturströndin hefur algjörlega opinn sjóndeildarhring. Stuttur heilmyrkvi (nálægt suðurjaðri slóðar) en frábært aðgengi — aðeins 45 mínútur frá Reykjavík um Hvalfjarðargöng.',
      'Frítt bílastæði nálægt vitanum og meðfram strandvegi.',
      'Slétt strandsvæði nálægt vitanum. Malbikaðir stígar og malarströnd.',
      NULL::jsonb
    ),

    -- ─── REYKJAVÍK ───
    (
      'grotta-lighthouse-reykjavik', 'is',
      'Gróttuviti',
      'Sjávarsker á vestasta odda Seltjarnarness í Reykjavík. Opið sjónarútsýni til vesturs án þéttbýlisljósmengunar eða bygginga við sjóndeildarhring. Besti sólmyrkvaeftirlitsstaðurinn innan höfuðborgarinnar. Athugaðu sjávarföll — eyjarinn getur verið ófáanlegur við háflóð.',
      'Frítt bílastæði við inngang Gróttu náttúruverndarsvæðis. ~30 stæði, 5 mín gangur að vita.',
      'Slétt eldfjallaberg og malarströnd. Sjávarfallarögn getur verið kaffærð — athugaðu sjávarfallatöflur fyrir 12. ágúst.',
      '[
         {"level":"bad","title":"Vegur að vitanum á eyjunni er AÐEINS aðgengilegur við lágflóð — athugaðu sjávarfallatöflu 12. ágúst","body":""},
         {"level":"warn","title":"Verður MJÖG fjölmennt — hugsanlega þúsundir manna frá öllu höfuðborgarsvæðinu","body":""},
         {"level":"warn","title":"Bílastæði fyllast mjög snemma — íhugaðu að ganga eða hjóla frá Seltjarnarnesi","body":""}
       ]'::jsonb
    ),
    (
      'perlan-reykjavik', 'is',
      'Perlan — útsýnispallur',
      'Hin táknræna kúla­bygging Reykjavíkur með 360° útsýnispalli, byggð ofan á heitavatnsgeymum á Öskjuhlíð. Hækkar áhorfandann ~25 m yfir nærliggjandi tré og borgarhverfin, sem skilar opnum vestursjóndeildarhring yfir Faxaflóa. Innandyra þjónusta (kaffi, salerni) er til staðar — einn fárra borgarvalkosta með skjóli fyrir veðri.',
      'Bílastæði við Perlan eru ókeypis (gestir í safninu fá þó forgang). Strætisvagnaleiðir 18 og 19.',
      'Útsýnispallur með handriðum allt í kring. Algjörlega aðgengilegur með lyftum.',
      '[
         {"level":"warn","title":"Perlan er sjálf á lágri hæð — ekki nálægt jaðri myrkvaslóðar, en heilmyrkvi varir aðeins um eina mínútu","body":""},
         {"level":"warn","title":"Aðgangur að útsýnispalli kostar — kauptu miða fyrirfram","body":""},
         {"level":"warn","title":"Vinsæl staðsetning — búast má við miklum mannfjölda","body":""}
       ]'::jsonb
    ),
    (
      'sky-lagoon', 'is',
      'Sky Lagoon',
      'Jarðhitalón við ströndina í Kópavogi, með óhindrað útsýni til vesturs yfir Faxaflóa. Þú getur upplifað sólmyrkvann í volgu vatni — einstök samsetning. Lónið er manngert en hannað í kring um náttúrulegt klettaumhverfi sem hentar vel sem áhorfsumgjörð.',
      'Stór malbikuð bílastæði við Sky Lagoon. Frítt fyrir gesti.',
      'Slétt malbikað gönguflæmi. Aðgangur að lóninu krefst miða.',
      '[
         {"level":"warn","title":"Aðgangur kostar — bókaðu fyrirfram, bókanir fyllast hratt á sólmyrkvadaginn","body":""},
         {"level":"warn","title":"Sky Lagoon er á jaðri myrkvaslóðar — heilmyrkvi varir aðeins ~1 mín","body":""},
         {"level":"info","title":"Sólmyrkvagleraugu eru nauðsynleg fyrir deildarmyrkvafasa — taktu þau með í lónið","body":""}
       ]'::jsonb
    ),

    -- ─── REYKJANES ───
    (
      'reykjanesta-lighthouse', 'is',
      'Reykjanestáviti',
      'Suðvesturoddi Íslands með 270° sjávarsjóndeildarhring — ekkert nema opið Atlantshaf til vesturs, suðurs og norðvesturs. Hámarkar óhindraðan útsýni fyrir lágstæða heilmyrkvasól. Meðal lengstu heilmyrkvalengda á Reykjanesi.',
      'Frítt malarbílastæði við vitaafleggjarann frá Þjóðvegi 425. ~30 bílar.',
      'Klettótt hraunhöfði með sléttum svæðum nálægt vitanum. Góðir gönguskór mælt með.',
      '[
         {"level":"bad","title":"⚠️ VIRK ELDSTÖÐ: Athugaðu eldgosastöðu á safetravel.is fyrir heimsókn","body":""},
         {"level":"bad","title":"Vegir að vitanum gætu verið lokaðir vegna eldgosa á Sundhnúksgígaröðinni","body":""},
         {"level":"warn","title":"Engin þjónusta við vitann — taktu með þér birgðir","body":""}
       ]'::jsonb
    ),
    (
      'keflavik-asbru-viewpoint', 'is',
      'Keflavíkurflugvallarsvæði (Ásbrú)',
      'Slétt hraunslétta umhverfis Keflavíkurflugvöll er einn af opnustu og óhindruðustu landflákum Íslands. Ásbrúarsvæðið hefur slétt opið undirlag með skýrum vesturhafssjóndeildarhring. Komandi gestir geta náð áhorfsstað án nokkurs ferðalags frá flugvellinum.',
      'Opin slétt svæði um allt Ásbrúarsvæðið. Frítt óformlegt bílastæði.',
      'Slétt hraunslétta þakin mosa og möl. Algjörlega slétt, opið landslag.',
      NULL::jsonb
    ),
    (
      'hvalsneskirkja', 'is',
      'Hvalsneskirkja',
      'Söguleg steinkirkja frá 1887 á opnu suðurströnd Reykjanesskaga, í dramatískum sandöldum og hraunfláka með algjörlega óhindrað útsýni til suðurs og vesturs. Skáldið Hallgrímur Pétursson þjónaði sem prestur hér á 1640. áratugnum — legsteinn dóttur hans Steinunnar stendur innandyra. Berskjölduð strandstaðsetning býður hreinn vestursjávarsjóndeildarhringur — nákvæmlega áttin að heilmyrkvasólinni. Um 5 km sunnan við Sandgerðisströnd og 30 mínútur frá Keflavíkurflugvelli.',
      'Lítið frítt bílastæði við kirkjuna. Malbikaður aðkomuvegur um Þjóðveg 44 frá Sandgerði.',
      'Graskenndur kirkjugarður með malarstígum. Opnar strandfláka með sandöldum og hraunfláka til suðurs og vesturs — algjörlega óhindraður vestursjóndeildarhringur.',
      NULL::jsonb
    ),
    (
      'gardur-lighthouse', 'is',
      'Garðsviti (Garðskagi)',
      'Á nyrsta odda Reykjanesskaga bjóða Garðskaga­vitar 270° sjónarpanorama. Tveir vitar (gamli frá 1897 og nýr) standa á sléttum höfða með algjörlega opnum sjóndeildarhring til norðurs, vesturs og suðurs. Einn besti staðurinn á Reykjanesi fyrir óhindrað sólmyrkvaeftirlit. Aðeins 20 mínútur frá Keflavíkurflugvelli.',
      'Frítt bílastæði nálægt báðum vitum. Malbikað bílastæði.',
      'Sléttur strandhöfði með malbikuðum stígum milli vita. Opið og berskjöldað fyrir vindi.',
      '[
         {"level":"warn","title":"Mjög vindberskjölduð strandtá — festu búnað og klæddu þig í vindheldan búnað","body":""},
         {"level":"warn","title":"Verður vinsælt vegna nálægðar við Keflavíkurflugvöll — búast má við mannfjölda","body":""},
         {"level":"warn","title":"Besti áhorfsstaður Reykjaness — bílastæði (~40 bílar) gæti fyllst á sólmyrkvadaginn","body":""}
       ]'::jsonb
    ),
    (
      'blue-lagoon', 'is',
      'Bláa lónið',
      'Frægasta jarðhitalón Íslands, í hraunfláka Reykjanesskaga nálægt Grindavík. Lónið er útsett til vesturs með opnum sjóndeildarhring í áttina að heilmyrkvasólinni — að upplifa myrkvann í mjólkurbláu jarðhitavatni er einstök upplifun. ATH: athugaðu eldgosastöðu á safetravel.is áður en þú heimsækir, þar sem lónið hefur verið lokað í eldgosalotum á Reykjanesi 2023–2024.',
      'Stór malbikuð bílastæði við Bláa lónið. Frítt fyrir gesti.',
      'Slétt malbikuð svæði og pallar í kringum lónið. Aðgengilegt öllum.',
      '[
         {"level":"bad","title":"⚠️ VIRK ELDSTÖÐ: Athugaðu eldgosastöðu á safetravel.is — lónið var lokað í eldgosum 2023–2024","body":""},
         {"level":"warn","title":"Aðgangur kostar og krefst bókunar — bókanir á sólmyrkvadaginn munu fyllast hratt","body":""},
         {"level":"warn","title":"Sólmyrkvagleraugu nauðsynleg fyrir deildarmyrkvafasa — taktu þau með í lónið","body":""}
       ]'::jsonb
    )
)
INSERT INTO viewing_spot_translations (
  spot_slug, locale, name, description, parking_info, terrain_notes, warnings
)
SELECT
  t.spot_slug, t.locale, t.name, t.description, t.parking_info, t.terrain_notes, t.warnings
FROM translations t
WHERE EXISTS (
  SELECT 1 FROM viewing_spots vs WHERE vs.slug = t.spot_slug
)
ON CONFLICT (spot_slug, locale) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  parking_info  = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  warnings      = EXCLUDED.warnings,
  updated_at    = NOW();

-- After running, list which translation rows actually landed:
--
--   SELECT spot_slug FROM viewing_spot_translations WHERE locale = 'is'
--   ORDER BY spot_slug;
--
-- And which production spots are still missing an Icelandic translation:
--
--   SELECT slug FROM viewing_spots
--   WHERE NOT EXISTS (
--     SELECT 1 FROM viewing_spot_translations
--     WHERE spot_slug = viewing_spots.slug AND locale = 'is'
--   )
--   ORDER BY slug;
