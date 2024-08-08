filtre = [
    {//nivell1
        1: { //1-1
            aFiltrar: [A, B],
            condicio: and

        },
        2: {//1-2
            aFiltrar: C,
            condicio: and
        },
        3: {//1-3
            aFiltrar: [D, E],
            condicio: and
        }
    },
    {//nivell2
        1: {//2-1
            ajuntar: [1, 2], //1-1,1-2
            condicio: and
        },
        2: {//2-2
            ajuntar: 3,//1-3
            condicio: and
        }
    },
    {//nivel3
        1: {//3-1
            ajuntar: [1, 2],//2-1,2-2
            condicio: and
        }
    }
]