//https://www.chartjs.org/docs/3.9.1/samples/scales/time-line.html
var data = { //L'Eix en total? S'ha de crear?
  labels: [ // Date Objects
    Utils.newDate(0),
    Utils.newDate(1),
    Utils.newDate(2),
    Utils.newDate(3),
    Utils.newDate(4),
    Utils.newDate(5),
    Utils.newDate(6)
  ],
  datasets: [{
    label: 'My First dataset',
    backgroundColor: Utils.transparentize(Utils.CHART_COLORS.red, 0.5),
    borderColor: Utils.CHART_COLORS.red,
    fill: false,
    data: Utils.numbers(NUMBER_CFG),
  }, {
    label: 'My Second dataset',
    backgroundColor: Utils.transparentize(Utils.CHART_COLORS.blue, 0.5),
    borderColor: Utils.CHART_COLORS.blue,
    fill: false,
    data: Utils.numbers(NUMBER_CFG),
  }, {
    label: 'Dataset with point data',
    backgroundColor: Utils.transparentize(Utils.CHART_COLORS.green, 0.5),
    borderColor: Utils.CHART_COLORS.green,
    fill: false,
    data: [{ //LES DADES Cada dataset tindrà les seves 
      x: Utils.newDateString(0),
      y: Utils.rand(0, 100)
    }, {
      x: Utils.newDateString(5),
      y: Utils.rand(0, 100)
    }, {
      x: Utils.newDateString(7),
      y: Utils.rand(0, 100)
    }, {
      x: Utils.newDateString(15),
      y: Utils.rand(0, 100)
    }],
  }]
};
var config = {
  type: 'line',
  data: data,
  options: {
    plugins: {
      title: {
        text: 'Chart.js Time Scale', //Titol adalt de tot
        display: true
      }
    },
    scales: { //EIXOS
      x: {
        type: 'time',
        time: {
          // Luxon format string
          tooltipFormat: 'DD T' //Format de la data (ens faltaria l'any?)
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'value'
        }
      }
    },
  },
};

var DATA_COUNT = 7;
var NUMBER_CFG = { count: DATA_COUNT, min: 0, max: 100 };


var actions = [
  {
    name: 'Randomize',
    handler(chart) {
      chart.data.datasets.forEach(dataset => {
        dataset.data.forEach(function (dataObj, j) {
          const newVal = Utils.rand(0, 100);

          if (typeof dataObj === 'object') {
            dataObj.y = newVal;
          } else {
            dataset.data[j] = newVal;
          }
        });
      });
      chart.update(); //" aqui l'actualitzar "
    }
  },
];


////////////////////////////////// PEr modificar les etiquetes
//https://www.chartjs.org/docs/3.9.1/samples/scales/time-line.html
const config = {
  type: 'line',
  data: data,
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Chart with Tick Configuration'
      }
    },
    scales: {
      x: {
        ticks: {
          // For a category axis, the val is the index so the lookup via getLabelForValue is needed
          callback: function (val, index) {
            // Hide every 2nd tick label
            return index % 2 === 0 ? this.getLabelForValue(val) : '';
          },
          color: 'red',
        }
      }
    }
  },
};

//Chat gpt suggereix: 

const config = {
  type: 'line',
  data: {
    // Els teus datasets aquí
  },
  options: {
    plugins: {
      tooltip: {
        callbacks: {
          // Personalitzem el callback del 'label'
          label: function (tooltipItem) {
            const date = tooltipItem.raw; // Suposant que tens un valor de data a l'eix X
            const formattedDate = new Date(date);
            // Formategem la data i l'hora segons les teves especificacions (DD T HH:mm:ss)
            const day = formattedDate.getDate().toString().padStart(2, '0');  // Obtenim el dia en format de 2 xifres
            const month = (formattedDate.getMonth() + 1).toString().padStart(2, '0');  // Obtenim el mes
            const year = formattedDate.getFullYear(); // Any
            const hours = formattedDate.getHours().toString().padStart(2, '0');  // Hora
            const minutes = formattedDate.getMinutes().toString().padStart(2, '0');  // Minuts
            const seconds = formattedDate.getSeconds().toString().padStart(2, '0');  // Segons

            // Format final: "DD T HH:mm:ss"
            return `${day} T ${hours}:${minutes}:${seconds}`;
          }
        }
      }
    }
  }
};

////////////////// 2 axis 
const data = {
  labels:
    ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [
    {
      label: 'Page Views',
      data:
        [500, 600, 800, 700, 900],
      yAxisID: 'y-axis-1',
      backgroundColor:
        'rgba(75, 192, 192, 0.2)',
      borderColor:
        'rgba(75, 192, 192, 1)',
      borderWidth: 1
    },
    {
      label: 'Users',
      data:
        [30, 70, 50, 80, 60],
      yAxisID: 'y-axis-2',
      backgroundColor:
        'rgba(255, 99, 132, 0.2)',
      borderColor:
        'rgba(255, 99, 132, 1)',
      borderWidth: 1
    }
  ]
};
const config = {
  type: 'bar',
  data: data,
  options: {
    scales: {
      yAxes: [
        {
          type: 'linear',
          position: 'left',
          id: 'y-axis-1',
        },
        {
          type: 'linear',
          position: 'right',
          id: 'y-axis-2',
        },
      ]
    }
  }
};