SRC="${1%.png}.puml"
redo-ifchange $SRC
cat $SRC | plantuml -pipe > $3
