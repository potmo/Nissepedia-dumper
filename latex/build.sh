
#!/bin/bash

cat ./beginning.texpart > test.tex
cat ./articles/*.texpart >> test.tex
cat ./end.texpart >> test.tex

#/usr/texbin/pdflatex -synctex=1 -interaction=nonstopmode test.tex 
#/usr/texbin/splitindex test.idx
/usr/texbin/pdflatex -synctex=1 -interaction=nonstopmode test.tex 

