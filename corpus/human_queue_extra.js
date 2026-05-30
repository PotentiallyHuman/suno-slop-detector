/*
 * Extra human-songs queue, appended to profile_human.js's built-in list.
 * Entries: [artist, title, year, genre, lang]. When lang !== "en", the fetched
 * lyrics are translated to English (local ollama) before featurizing, so every
 * song is compared on the same footing. Over-provided per language to survive
 * lyrics.ovh 404s; we report which languages reached >=5.
 *
 * Goal: >=5 songs in each of ~20 common languages, on the way to ~1000 total.
 */
module.exports = [
  // Spanish
  ["Luis Fonsi","Despacito",2017,"latin","es"],["Shakira","La Tortura",2005,"latin","es"],
  ["Enrique Iglesias","Bailando",2014,"latin","es"],["Juanes","La Camisa Negra",2004,"latin","es"],
  ["Maná","Rayando el Sol",1992,"rock","es"],["Manu Chao","Me Gustas Tu",2001,"latin","es"],
  ["Gipsy Kings","Bamboleo",1987,"latin","es"],["Jesse & Joy","Corre",2011,"pop","es"],
  // French
  ["Édith Piaf","La Vie en Rose",1947,"chanson","fr"],["Stromae","Papaoutai",2013,"pop","fr"],
  ["Stromae","Alors on Danse",2009,"pop","fr"],["Indila","Dernière Danse",2013,"pop","fr"],
  ["Charles Aznavour","La Bohème",1965,"chanson","fr"],["Zaz","Je Veux",2010,"pop","fr"],
  ["Joe Dassin","Les Champs-Élysées",1969,"chanson","fr"],["Mylène Farmer","Désenchantée",1991,"pop","fr"],
  // German
  ["Nena","99 Luftballons",1983,"pop","de"],["Rammstein","Du Hast",1997,"metal","de"],
  ["Falco","Rock Me Amadeus",1985,"pop","de"],["Herbert Grönemeyer","Männer",1984,"rock","de"],
  ["Peter Fox","Haus am See",2008,"pop","de"],["Rammstein","Sonne",2001,"metal","de"],
  ["Die Toten Hosen","Tage wie diese",2012,"rock","de"],["Xavier Naidoo","Dieser Weg",2005,"pop","de"],
  // Italian
  ["Toto Cutugno","L'Italiano",1983,"pop","it"],["Domenico Modugno","Volare",1958,"pop","it"],
  ["Måneskin","Zitti e Buoni",2021,"rock","it"],["Eros Ramazzotti","Più Bella Cosa",1996,"pop","it"],
  ["Adriano Celentano","Azzurro",1968,"pop","it"],["Lucio Battisti","Il Mio Canto Libero",1972,"pop","it"],
  ["Laura Pausini","La Solitudine",1993,"pop","it"],
  // Portuguese
  ["Tom Jobim","Garota de Ipanema",1962,"bossa","pt"],["Legião Urbana","Tempo Perdido",1986,"rock","pt"],
  ["Anitta","Vai Malandra",2017,"pop","pt"],["Roberto Carlos","Detalhes",1971,"pop","pt"],
  ["Caetano Veloso","Sozinho",1998,"mpb","pt"],["Cesária Évora","Sodade",1992,"morna","pt"],
  ["Os Paralamas do Sucesso","Meu Erro",1984,"rock","pt"],
  // Russian
  ["Kino","Gruppa Krovi",1988,"rock","ru"],["t.A.T.u.","Ya Soshla S Uma",2000,"pop","ru"],
  ["Zemfira","Iskala",2000,"rock","ru"],["Alla Pugacheva","Million Alyh Roz",1982,"pop","ru"],
  ["DDT","Osen",1991,"rock","ru"],["Bi-2","Polkovniku Nikto Ne Pishet",2000,"rock","ru"],
  // Japanese
  ["YOASOBI","Idol",2023,"pop","ja"],["Hikaru Utada","First Love",1999,"pop","ja"],
  ["X Japan","Kurenai",1989,"rock","ja"],["Kyu Sakamoto","Ue o Muite Arukou",1961,"pop","ja"],
  ["Kenshi Yonezu","Lemon",2018,"pop","ja"],["Spitz","Robinson",1995,"rock","ja"],
  // Korean
  ["BTS","Spring Day",2017,"kpop","ko"],["BIGBANG","Fantastic Baby",2012,"kpop","ko"],
  ["IU","Through the Night",2017,"kpop","ko"],["BLACKPINK","DDU-DU DDU-DU",2018,"kpop","ko"],
  ["PSY","Gangnam Style",2012,"kpop","ko"],["EXO","Growl",2013,"kpop","ko"],
  // Mandarin Chinese
  ["Teresa Teng","The Moon Represents My Heart",1977,"pop","zh"],["Jay Chou","Qilixiang",2004,"pop","zh"],
  ["Faye Wong","Hong Dou",1998,"pop","zh"],["Jay Chou","Dao Xiang",2008,"pop","zh"],
  ["Beyond","Hai Kuo Tian Kong",1993,"rock","zh"],["Eason Chan","Shi Nian",2003,"pop","zh"],
  // Hindi
  ["A.R. Rahman","Jai Ho",2008,"bollywood","hi"],["Arijit Singh","Tum Hi Ho",2013,"bollywood","hi"],
  ["Kishore Kumar","Roop Tera Mastana",1969,"bollywood","hi"],["Lata Mangeshkar","Lag Jaa Gale",1964,"bollywood","hi"],
  ["Sonu Nigam","Kal Ho Naa Ho",2003,"bollywood","hi"],
  // Arabic
  ["Amr Diab","Tamally Maak",2000,"pop","ar"],["Fairuz","Kifak Inta",1991,"pop","ar"],
  ["Nancy Ajram","Ah W Noss",2004,"pop","ar"],["Umm Kulthum","Enta Omri",1964,"classical","ar"],
  ["Mohammed Abdu","Al Amaken",1990,"pop","ar"],
  // Turkish
  ["Tarkan","Şımarık",1997,"pop","tr"],["Sezen Aksu","Şarkı Söylemek Lazım",1996,"pop","tr"],
  ["Barış Manço","Dağlar Dağlar",1970,"rock","tr"],["MFÖ","Ele Güne Karşı",1984,"pop","tr"],
  ["Sertab Erener","Everyway That I Can",2003,"pop","tr"],
  // Dutch
  ["Marco Borsato","Dromen Zijn Bedrog",1994,"pop","nl"],["André Hazes","Bloed Zweet en Tranen",1996,"pop","nl"],
  ["Doe Maar","De Bom",1982,"pop","nl"],["Boudewijn de Groot","Welterusten Meneer de President",1966,"folk","nl"],
  ["BLØF","Liefs Uit Londen",1998,"rock","nl"],
  // Polish
  ["Czesław Niemen","Dziwny Jest Ten Świat",1967,"rock","pl"],["Maanam","Lipstick on the Glass",1983,"rock","pl"],
  ["Budka Suflera","Jolka Jolka",1981,"rock","pl"],["Anna Jantar","Nie Wierz Nigdy Kobiecie",1976,"pop","pl"],
  ["Kombii","Pokolenie",1984,"pop","pl"],
  // Swedish
  ["Veronica Maggio","Måndagsbarn",2011,"pop","sv"],["Kent","Mannen i den vita hatten",2002,"rock","sv"],
  ["Håkan Hellström","Det Kommer Aldrig Va Över För Mig",2013,"pop","sv"],["Laleh","Some Die Young",2012,"pop","sv"],
  ["Bo Kaspers Orkester","Just Nu",1996,"pop","sv"],
  // Greek
  ["Marinella","To Agori Mou",1969,"pop","el"],["Haris Alexiou","To Tango Tis Nefelis",1996,"pop","el"],
  ["Mikis Theodorakis","Sto Perigiali",1960,"folk","el"],["Antonis Remos","Kardia Mou Min Anhsis",2000,"pop","el"],
  ["Despina Vandi","Gia",2003,"pop","el"],
  // Indonesian
  ["Iwan Fals","Bento",1989,"rock","id"],["Chrisye","Lilin Lilin Kecil",1977,"pop","id"],
  ["Sheila on 7","Dan",2000,"rock","id"],["Dewa 19","Kangen",1992,"rock","id"],
  ["Tulus","Monokrom",2016,"pop","id"],
  // Vietnamese
  ["Sơn Tùng M-TP","Lạc Trôi",2017,"pop","vi"],["Mỹ Tâm","Họa Mi Tóc Nâu",2004,"pop","vi"],
  ["Trịnh Công Sơn","Diễm Xưa",1960,"folk","vi"],["Đàm Vĩnh Hưng","Tình Ơi Xin Ngủ Yên",2005,"pop","vi"],
  // Thai
  ["Bird Thongchai","Khu Kad",1986,"pop","th"],["Carabao","Made in Thailand",1984,"rock","th"],
  ["Tata Young","Dhoom Dhoom",2004,"pop","th"],["Bodyslam","Khwam Cheua",2005,"rock","th"],
];
