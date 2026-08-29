-- La page où la source publie le mix, distincte de `sourceRef` qui ne désigne
-- que le fichier à lire. Nullable : les mix déposés à la main n'en ont pas, et
-- ceux déjà importés sont rattrapés par `backfill-source-page-urls`, pas par
-- cette migration — retrouver la page demande parfois d'interroger la source.
ALTER TABLE "mixes" ADD COLUMN "sourcePageUrl" TEXT;
