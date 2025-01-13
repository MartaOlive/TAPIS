/* 
    This file is part of TAPIS. TAPIS is a web page and a Javascript code 
    that builds queries and explore the STAplus content, saves it as CSV or 
    GeoJSON and connects with the MiraMon Map Browser. While the project is 
    completely independent from the Orange data mining software, it has been 
    inspired by its GUI. The general idea of the application is to be able 
    to work with STA data as tables.
  
    The TAPIS client is free software under the terms of the MIT License

    Copyright (c) 2023-2024 Joan Masó

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    
    The TAPIS can be updated from https://github.com/joanma747/tapis.

    Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at ieee org) 
    dins del grup del MiraMon. MiraMon és un projecte del 
    CREAF que elabora programari de Sistema d'Informació Geogràfica 
    i de Teledetecció per a la visualització, consulta, edició i anàlisi 
    de mapes ràsters i vectorials. Aquest progamari programari inclou
    aplicacions d'escriptori i també servidors i clients per Internet.
    No tots aquests productes són gratuïts o de codi obert. 
    
    En particular, el TAPIS es distribueix sota els termes de la llicència MIT.
    
    El TAPIS es pot actualitzar des de https://github.com/joanma747/tapis.
*/

"use strict"

function oemToAnsi(c)
{
var t_oemansi=[	199, 252, 233, 226, 228, 224, 229, 231, 234, 235, 232, 239, 238, 236,
		196, 197, 201, 230, 198, 244, 246, 242, 251, 249, 255, 214, 220, 248,
		163, 216, 215, 131, 225, 237, 243, 250, 241, 209, 170, 186, 191, 174,
		172, 189, 188, 161, 171, 187, 164, 164, 164, 166, 166, 193, 194, 192,
		169, 166, 166, 164, 164, 162, 165, 164, 164, 164, 164, 164, 164, 164,
		227, 195, 164, 164, 164, 164, 166, 164, 164, 164, 240, 208, 202, 203,
		200, 180, 205, 206, 207, 164, 164, 164, 164, 166, 204, 164, 211, 223,
		212, 210, 245, 213, 181, 254, 222, 218, 219, 217, 253, 221, 175, 180,
		173, 177, 164, 190, 182, 167, 247, 184, 176, 168, 183, 185, 179, 178,
		164, 183];
	if ( c <= 127)
		return c;
	return t_oemansi[c-128];
}
