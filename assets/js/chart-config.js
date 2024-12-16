document.addEventListener('DOMContentLoaded', function () {
    Highcharts.chart('chart-container', {
      chart: {
        zoomType: 'xy' // Combina líneas y columnas
      },
      title: {
        text: 'ELIND SAS vs Competencia'
      },
      subtitle: {
        text: 'Errores de Fabricación y Costos Acumulativos.\nDatos reales, tomados durante 12 meses en la planta de un cliente con equipos de la competencia y de alta frecuencia ELIND.'
      },
      xAxis: {
        categories: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        crosshair: true
      },
      yAxis: [{ // Eje Y Primario (Errores)
        title: {
          text: 'Errores de Fabricación (Cantidad)'
        },
        labels: {
          format: '{value}'
        }
      }, { // Eje Y Secundario (Costos)
        title: {
          text: 'Costos Acumulativos (USD)',
          style: {
            color: Highcharts.getOptions().colors[0]
          }
        },
        labels: {
          format: '${value}'
        },
        opposite: true
      }],
      tooltip: {
        shared: true
      },
      legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom'
      },
      colors: ['#007bff', '#6c757d'], // Azul para ELIND, gris para la competencia
      series: [
        { // Errores - ELIND
          name: 'Errores (ELIND)',
          type: 'line',
          data: [10, 8, 7, 6, 5, 6, 7, 6, 6, 3, 3, 3],
          tooltip: {
            valueSuffix: ' errores'
          }
        },
        { // Errores - Competencia
          name: 'Errores (Competencia)',
          type: 'line',
          data: [40, 38, 35, 34, 30, 28, 22, 35, 31, 36, 30, 24],
          tooltip: {
            valueSuffix: ' errores'
          }
        },
        { // Costos Acumulativos - ELIND
          name: 'Costos Acumulativos (ELIND)',
          type: 'column',
          yAxis: 1,
          data: [150, 270, 375, 465, 540, 630, 735, 825, 915, 960, 1005, 1050],
          tooltip: {
            valuePrefix: '$'
          }
        },
        { // Costos Acumulativos - Competencia
          name: 'Costos Acumulativos (Competencia)',
          type: 'column',
          yAxis: 1,
          data: [600, 1170, 1695, 2205, 2655, 3075, 3405, 3930, 4395, 4935, 5385, 5745],
          tooltip: {
            valuePrefix: '$'
          }
        }
      ]
    });
  });
  