-- Icelandic translations for curated viewing spots.
--
-- Run AFTER migration 008-spot-translations.sql.
-- Re-running this script is safe — every INSERT is wrapped in
-- ON CONFLICT (spot_id, locale) DO UPDATE so it acts as an upsert.
--
-- Source content lives in scripts/seed-viewing-spots-v2.sql (English)
-- and scripts/migrations/004 + 005 (warnings shape + levels). The
-- translations here mirror those levels and titles so the UI's
-- severity-tinted advisories work identically on /is/*.
--
-- Translation notes:
--   • Icelandic place names are kept (Snæfellsjökull, Vestfirðir,
--     Reykjavík, Reykjanesskagi, Borgarfjörður).
--   • Eclipse vocabulary follows established Icelandic usage:
--     heilmyrkvi (totality), heilsólmyrkvi (total eclipse),
--     deildarmyrkvi (partial), kóróna, sjóndeildarhringur,
--     sólhæð, azimút.
--   • Decimal comma in numbers where Icelandic convention requires
--     it; route numbers stay the same.
--   • Translations are machine-quality but follow native idiom
--     where possible. Recommend a native review pass before launch
--     for the longer paragraphs.

BEGIN;

-- ============================================================================
-- WESTFJORDS
-- ============================================================================

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('isafjordur', 'is',
 'Ísafjarðarhöfn',
 'Hafnarsléttan á Ísafirði býður upp á opinn vestursjóndeildarhring yfir mynni fjarðarins. Sem stærsti bær Vestfjarða sameinar Ísafjörður gott aðgengi við miðlæga staðsetningu á heilmyrkvaleiðinni. Umliggjandi fjöll ramma inn himininn til austurs en skilja eftir vesturátt — það mikilvægasta — algjörlega opna.',
 'Stór almenningsbílastæði á hafnarsléttunni (við Pollinn). Frí, malbikuð.',
 'Slétt uppfyllt hafnarland og malbikað kantmúr. Engar hindranir til vesturs.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('dynjandi', 'is',
 'Útsýnisstaður við Dynjanda',
 'Bílastæðið við rætur hins táknræna Dynjandafoss liggur við botn Arnarfjarðar, eins víðasta fjarðar Vestfjarða. Fjörðurinn opnast beint til vesturs og veitir lágan, hreinan sjóndeildarhring til hafs. Nálægt miðlínu þar sem lengd nálgast hámarkið fyrir Ísland.',
 'Tileinkað malarbílastæði við endann á viðtenginu af Þjóðvegi 60, ~50 bílar. Frítt.',
 'Slétt malarbílastæði og graslendi við fjarðarbotninn. Fossinn í baksýn.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('thingeyri', 'is',
 'Þingeyrarströnd',
 'Þingeyri stendur á suðurströnd Dýrafjarðar, sem liggur næstum fullkomlega austur–vestur. Fjörðurinn virkar sem náttúruleg sjónrás sem bendir beint að opnu hafi — fullkomlega samstillt við sólstöðu á heilmyrkva. Nálægt miðlínu fyrir nær hámarkslengd.',
 'Opið malar- og graslendi með ströndvegi. Óformlegt bílastæði, engar hömlur.',
 'Slétt strandræma með möl. Fjörðurinn opnast til vesturs án hindrana.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('patreksfjordur', 'is',
 'Patreksfjarðarströnd',
 'Patreksfjörður er við ytra svæði Vestfjarða með frábæru aðgengi um Þjóðveg 62. Ströndin býður slétt sandflæmi þar sem fjarðarmunnurinn opnast til vestursuðvesturs. Bærinn hefur eldsneytisstöð og grunnþjónustu, sem gerir hann að hagnýtri bækistöð fyrir sólmyrkvagesti.',
 'Götubílastæði í gegnum bæinn er ókeypis. Slétt graslendi nálægt höfninni fyrir óformlega áhorfun.',
 'Sandströnd og slétt hafnarsvæði. Vestursýn fjarðarins óhindruð.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('flateyri', 'is',
 'Flateyrarströnd',
 'Lítið þorp í Önundarfirði með sléttum sandtanga sem teygir sig út í fjörðinn. Fjörðurinn opnast til vesturs og gefur óhindraða sýn í átt að sólmyrkvanum. Nálægt Ísafirði (20 mín akstur) ef varaþjónustu þarf.',
 'Óformlegt bílastæði meðfram þorpsveginum og við ströndina. Frítt.',
 'Slétt sandtangi og malarströnd. Opin fjarðarsýn til vesturs.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('sudureyri', 'is',
 'Suðureyrarhöfn',
 'Rólegt sjávarþorp við Súgandafjörð. Höfnin býður slétt og opið áhorfssvæði þar sem fjarðarmunnurinn opnast til vesturs. Íbúafjöldi ~300 með grunnþjónustu.',
 'Lítið hafnarbílastæði. Frítt.',
 'Slétt hafnarbryggja og malarströnd.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('bildudalur', 'is',
 'Bíldudalshöfn',
 'Þorp við strönd Arnarfjarðar, eins víðasta fjarðar Vestfjarða. Nálægt miðlínu sólmyrkvans með frábæra heilmyrkvalengd. Fjörðurinn opnast til vesturs. Heimili Skrímslasetursins.',
 'Götubílastæði nálægt höfninni. Frítt.',
 'Slétt hafnarsvæði og strandvegur með opnu fjarðarútsýni.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('breidavik', 'is',
 'Breiðavíkurströnd',
 'Stórbrotin gylt sandströnd nálægt Látrabjargi, sem horfir í vestur yfir opið Atlantshaf. Einn af þeim stöðum á meginlandinu sem eru næst miðlínu sólmyrkvans. Algjörlega óhindraður vestursjóndeildarhringur. Engin þjónusta — taktu með þér allt sem þú þarft.',
 'Lítið malarbílastæði við ströndina. Frítt.',
 'Gylt sandströnd, slétt og opin. Opin fyrir Atlantshafsvindum.',
 '[
   {"level":"warn","title":"Afskekkt: 2 klst akstur frá Patreksfirði um malar­vegi að hluta","body":""},
   {"level":"warn","title":"Eina þjónustan er Hótel Breiðavík — bókaðu gistingu með góðum fyrirvara","body":""},
   {"level":"warn","title":"Ekkert farsímasamband — sæktu ónettengd kort fyrir komu","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('latrabjarg', 'is',
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
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

-- ============================================================================
-- SNÆFELLSNES
-- ============================================================================

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('rif', 'is',
 'Rifshöfn',
 'Sjávarþorpið Rif á norðurströnd Snæfellsness býður opna sjónaratursýn í norðvestur frá hafnarsléttunni. Snæfellsjökull rís í suðri sem stórbrotin baksvið. Innan miðju sólmyrkvaslóðar með opnum sjóndeildarhring fyrir lágstæða heilmyrkvasól.',
 'Slétt malarhafnarsvæði með nóg af óformlegum bílastæðum. Frítt.',
 'Slétt malarhafnarbryggja og opið undirlag. Stöðug möl og steinsteypa.',
 '[
   {"level":"warn","title":"Mjög lítið þorp (~100 íbúar) — afar takmörkuð gistirými","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('arnarstapi', 'is',
 'Arnarstapi — strandhilla',
 'Stórbrotið strandþorp við rætur Snæfellsjökuls. Slétta hraunhillan sem teygist út í hafið veitir víðan opinn vestursjóndeildarhring. Frægi sjávarboginn Gatklettur og svartir basaltdrangar skapa stórfengilegt umhverfi fyrir sólmyrkvaeftirlit.',
 'Tileinkað malarbílastæði við byrjun strandgöngunnar. Frítt, ~60–80 bílar.',
 'Slétt eða hægbylgjandi hraunhilla. Sums staðar grýtt undirlag við klettana.',
 '[
   {"level":"bad","title":"Bjargbrúnir meðfram strandgöngunni eru ógirtar — fylgstu með börnum og stígðu varlega","body":""},
   {"level":"warn","title":"Vinsæll ferðamannastaður — búast má við miklum mannfjölda á sólmyrkvadaginn","body":""},
   {"level":"warn","title":"Bílastæði takmörkuð — íhugaðu að koma vel á undan myrkvatíma","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('stykkisholmur', 'is',
 'Stykkishólmur — Hafnarhæð',
 'Stærsti bær Snæfellsness, staðsettur við Breiðafjörð. Klettahæðin Súgandisey gefur 360° útsýni þar með talinn skýran vestursjóndeildarhring yfir eyjastráðan flóann. Frábær þjónusta með hótel, veitingastöðum og eldsneyti.',
 'Bílastæði í bænum eru ókeypis. Bílastæði nálægt höfninni með göngusamböndum að Súgandisey.',
 'Klettóttur basalthóll (~20 m) með tröppum. Slétt áhorfsstétt á tindinum. Höfnin fyrir neðan er fullmalbikuð.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('olafsvik', 'is',
 'Ólafsvíkurhöfn',
 'Lítill útgerðarbær á norðurströnd Snæfellsness. Hafnarsvæðið býður slétta áhorfsstétt þar sem Snæfellsjökull rís í suðri. Opið sjónarútsýni til norðurs og vesturs.',
 'Frítt bílastæði nálægt höfninni og meðfram aðalveginum.',
 'Slétt hafnarsvæði og strandvegur. Opið útsýni til norðurs og vesturs.',
 '[
   {"level":"warn","title":"Hafnarsvæðið verður líklega aðal samkomustaður — komdu snemma fyrir góða stöðu","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('hellissandur', 'is',
 'Hellissandur',
 'Vestasta þorp Snæfellsness, við rætur Snæfellsjökuls. Opið útsýni til norðurs og vesturs frá útjaðri þorpsins. Gamla útvarpsmastrið nálægt er staðbundið kennileiti.',
 'Frítt bílastæði í þorpsmiðju og nálægt gamla útvarpsmastri.',
 'Slétt undirlag með opnu útsýni. Skýlt fyrir suðanvindum af Snæfellsjökli.',
 '[
   {"level":"warn","title":"Lítið þorp (~380 íbúar) — takmarkað matarval og gisting","body":""},
   {"level":"warn","title":"Bókaðu gistingu með góðum fyrirvara — gistirými seljast upp í myrkvavikunni","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('budir', 'is',
 'Búðakirkja',
 'Hin táknræna svarta timburkirkja á Búðum stendur á opnum hraunfláka með víðu útsýni til vesturs yfir Faxaflóa. Sterkt mótvægi svartrar kirkjunnar við myrkvaðan sólmyrkvahimin gerir þetta að draumastað ljósmyndara. Hótel Búðir veitir glæsiþjónustu nálægt.',
 'Bílastæði við Hótel Búðir og nálægt kirkjunni. Frítt.',
 'Opinn hraunfláki með mosakenndu undirlagi. Slétt landslag í kringum kirkjuna.',
 '[
   {"level":"warn","title":"Takmörkuð bílastæði (~20 bílar) — komdu snemma á sólmyrkvadaginn","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('kirkjufell', 'is',
 'Kirkjufell — útsýnisstaður',
 'Mest myndaða fjall Íslands gerir stórkostlegt sólmyrkvabaksvið. 5 mínútna gangur frá bílastæði að klassíska útsýnisstaðnum með Kirkjufellsfoss í forgrunni og hinn táknræna örvarodd í baksýn. Heilmyrkvi sem útlínar Kirkjufell verður ógleymanlegur.',
 'Stór bílastæði við Kirkjufellsfoss. Frítt, malbikað.',
 'Vel viðhaldinn malarstígur frá bílastæði að útsýnisstað. Að mestu sléttur.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('djupalonssandur', 'is',
 'Djúpalónssandur',
 'Svört hraunmölströnd á vesturodda Snæfellsness, innan Þjóðgarðsins Snæfellsjökuls. Stuttur gangur frá bílastæði í gegnum hraunmyndanir niður á dramatíska ströndina. Snýr beint til vesturs — fullkomin samstilling fyrir myrkvaða sólina við 249° azimút. Salerni við bílastæði.',
 'Malbikað bílastæði við gönguupphafið. Frítt, salerni til staðar.',
 'Malarstígur í gegnum hraunmyndanir, hægur niðurganga á strönd. Sums staðar ójafnt undirlag.',
 '[
   {"level":"warn","title":"Innan Þjóðgarðsins Snæfellsjökuls — búast má við töluverðum mannfjölda á sólmyrkvadaginn","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('saxholl', 'is',
 'Saxhóll',
 'Gjallhóll með vel viðhaldnu málm­tröppustigi (~400 þrep) sem leiðir upp á barminn. 360° víðsýni frá tindinum nær yfir Snæfellsjökul, Atlantshafið og umliggjandi hraunfláka. Að horfa á heilmyrkvann innan úr eldfjallagjá er einstök upplifun.',
 'Malarbílastæði við rætur hólsins. Frítt.',
 'Málmtröppustigi upp á barminn er vel viðhaldinn. Getur verið hvasst á tindinum.',
 '[
   {"level":"warn","title":"Mjög vindberskjölduð á gjárbarminum — festu allan búnað og myndavélar","body":""},
   {"level":"warn","title":"Mjög takmörkuð bílastæði (~15 bílar við gjárrót) — komdu snemma","body":""},
   {"level":"warn","title":"Málmtröppustiginn (~400 þrep) getur verið háll í bleytu","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('snaefellsjokull', 'is',
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
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

-- ============================================================================
-- BORGARFJÖRÐUR
-- ============================================================================

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('borgarnes', 'is',
 'Borgarnes — strandsvæði',
 'Borgarnes situr á tanga í Borgarfirði, með fjörðinn opnandi til vesturs í átt að Snæfellsnesi. Nálægt jaðri myrkvaslóðar svo lengdin er stutt (~40s), en bærinn býður frábæra þjónustu sem viðkomustaður á Þjóðvegi 1. Íhugaðu að keyra norður fyrir lengri heilmyrkva.',
 'Mörg ókeypis bílastæði við landnámssetrið og meðfram vesturstrandvegi.',
 'Slétt strandgras og malarströnd á vesturhlið tangans. Aðgengilegt öllum.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('akranes', 'is',
 'Akranesviti',
 'Bær á tánni á Akranestanga með vita sem býður 270° sjónarútsýni. Vesturströndin hefur algjörlega opinn sjóndeildarhring. Stuttur heilmyrkvi (nálægt suðurjaðri slóðar) en frábært aðgengi — aðeins 45 mínútur frá Reykjavík um Hvalfjarðargöng.',
 'Frítt bílastæði nálægt vitanum og meðfram strandvegi.',
 'Slétt strandsvæði nálægt vitanum. Malbikaðir stígar og malarströnd.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('reykholt', 'is',
 'Reykholt — Snorrastofa',
 'Sögulegt setur Snorra Sturlusonar á miðöldum, nú heimkynni Snorrastofu menningarmiðstöðvar. Opið dalsýni til vesturs. Mjög nálægt suðurjaðri myrkvans svo lengdin er stutt, en menningarleg þýðing og innlandsdalsumhverfi gefa einstakt áhorfssamhengi.',
 'Frítt bílastæði við Snorrastofu menningarmiðstöð.',
 'Slétt graslendi og malbikaðir stígar í kringum menningarmiðstöðina.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('glymur', 'is',
 'Glymur',
 'Næst hæsti foss Íslands (198 m) við botn Hvalfjarðar. Gangan felur í sér árvötn og brattar leiðir. Efri útsýnisstaðurinn býður dramatíska vestursýn niður fjörðinn. Nálægt myrkvajaðrinum — mjög stutt lengd, en framúrskarandi umhverfi fyrir þá sem vilja einstaka sólmyrkva-göngu samsetningu. Best júní–september þegar trjábrúin er á sínum stað.',
 'Bílastæði við gönguupphafið við endann á Botnsdalsvegi. Frítt.',
 'Bratt fjallgöngustígur með árvötnum. Köðlar og trjábrýr á stöðum. Sterkir gönguskór nauðsynlegir.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

-- ============================================================================
-- REYKJAVÍK
-- ============================================================================

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('grotta', 'is',
 'Gróttuviti',
 'Sjávarsker á vestasta odda Seltjarnarness í Reykjavík. Opið sjónarútsýni til vesturs án þéttbýlisljósmengunar eða bygginga við sjóndeildarhring. Besti sólmyrkvaeftirlitsstaðurinn innan höfuðborgarinnar. Athugaðu sjávarföll — eyjarinn getur verið ófáanlegur við háflóð.',
 'Frítt bílastæði við inngang Gróttu náttúruverndarsvæðis. ~30 stæði, 5 mín gangur að vita.',
 'Slétt eldfjallaberg og malarströnd. Sjávarfallarögn getur verið kaffærð — athugaðu sjávarfallatöflur fyrir 12. ágúst.',
 '[
   {"level":"bad","title":"Vegur að vitanum á eyjunni er AÐEINS aðgengilegur við lágflóð — athugaðu sjávarfallatöflu 12. ágúst","body":""},
   {"level":"warn","title":"Verður MJÖG fjölmennt — hugsanlega þúsundir manna frá öllu höfuðborgarsvæðinu","body":""},
   {"level":"warn","title":"Bílastæði fyllast mjög snemma — íhugaðu að ganga eða hjóla frá Seltjarnarnesi","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

-- ============================================================================
-- REYKJANES
-- ============================================================================

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('reykjanesta', 'is',
 'Reykjanestáviti',
 'Suðvesturoddi Íslands með 270° sjávarsjóndeildarhring — ekkert nema opið Atlantshaf til vesturs, suðurs og norðvesturs. Hámarkar óhindraðan útsýni fyrir lágstæða heilmyrkvasól. Meðal lengstu heilmyrkvalengda á Reykjanesi.',
 'Frítt malarbílastæði við vitaafleggjarann frá Þjóðvegi 425. ~30 bílar.',
 'Klettótt hraunhöfði með sléttum svæðum nálægt vitanum. Góðir gönguskór mælt með.',
 '[
   {"level":"bad","title":"⚠️ VIRK ELDSTÖÐ: Athugaðu eldgosastöðu á safetravel.is fyrir heimsókn","body":""},
   {"level":"bad","title":"Vegir að vitanum gætu verið lokaðir vegna eldgosa á Sundhnúksgígaröðinni","body":""},
   {"level":"warn","title":"Engin þjónusta við vitann — taktu með þér birgðir","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('keflavik', 'is',
 'Keflavíkurflugvallarsvæði (Ásbrú)',
 'Slétt hraunslétta umhverfis Keflavíkurflugvöll er einn af opnustu og óhindruðustu landflákum Íslands. Ásbrúarsvæðið hefur slétt opið undirlag með skýrum vesturhafssjóndeildarhring. Komandi gestir geta náð áhorfsstað án nokkurs ferðalags frá flugvellinum.',
 'Opin slétt svæði um allt Ásbrúarsvæðið. Frítt óformlegt bílastæði.',
 'Slétt hraunslétta þakin mosa og möl. Algjörlega slétt, opið landslag.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('hvalsneskirkja', 'is',
 'Hvalsneskirkja',
 'Söguleg steinkirkja frá 1887 á opnu suðurströnd Reykjanesskaga, í dramatískum sandöldum og hraunfláka með algjörlega óhindrað útsýni til suðurs og vesturs. Skáldið Hallgrímur Pétursson þjónaði sem prestur hér á 1640. áratugnum — legsteinn dóttur hans Steinunnar stendur innandyra. Berskjölduð strandstaðsetning býður hreinn vestursjávarsjóndeildarhring — nákvæmlega áttin að heilmyrkvasólinni. Um 5 km sunnan við Sandgerðisströnd og 30 mínútur frá Keflavíkurflugvelli.',
 'Lítið frítt bílastæði við kirkjuna. Malbikaður aðkomuvegur um Þjóðveg 44 frá Sandgerði.',
 'Graskenndur kirkjugarður með malarstígum. Opnar strandfláka með sandöldum og hraunfláka til suðurs og vesturs — algjörlega óhindraður vestursjóndeildarhringur.',
 NULL)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

INSERT INTO viewing_spot_translations (spot_id, locale, name, description, parking_info, terrain_notes, warnings) VALUES
('gardur', 'is',
 'Garðsviti (Garðskagi)',
 'Á nyrsta odda Reykjanesskaga bjóða Garðskaga­vitar 270° sjónarpanorama. Tveir vitar (gamli frá 1897 og nýr) standa á sléttum höfða með algjörlega opnum sjóndeildarhring til norðurs, vesturs og suðurs. Einn besti staðurinn á Reykjanesi fyrir óhindrað sólmyrkvaeftirlit. Aðeins 20 mínútur frá Keflavíkurflugvelli.',
 'Frítt bílastæði nálægt báðum vitum. Malbikað bílastæði.',
 'Sléttur strandhöfði með malbikuðum stígum milli vita. Opið og berskjöldað fyrir vindi.',
 '[
   {"level":"warn","title":"Mjög vindberskjölduð strandtá — festu búnað og klæddu þig í vindheldan búnað","body":""},
   {"level":"warn","title":"Verður vinsælt vegna nálægðar við Keflavíkurflugvöll — búast má við mannfjölda","body":""},
   {"level":"warn","title":"Besti áhorfsstaður Reykjaness — bílastæði (~40 bílar) gæti fyllst á sólmyrkvadaginn","body":""}
 ]'::jsonb)
ON CONFLICT (spot_id, locale) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description,
  parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes,
  warnings=EXCLUDED.warnings, updated_at=NOW();

COMMIT;
