
#!/bin/bash

/usr/texbin/makeindex andrasaker.idx 
/usr/texbin/makeindex saker.idx 
/usr/texbin/pdflatex -synctex=1 -interaction=nonstopmode test.tex 