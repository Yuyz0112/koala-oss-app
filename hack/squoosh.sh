#!/bin/bash 
for f in "assets/covers/*.jpg"
do 
  echo "Processing $f file..."
  npx @squoosh/cli --oxipng 2 $f
done