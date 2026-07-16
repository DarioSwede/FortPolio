/* charts.js
   Små inline SVG-sparklines - ingen extern grafbibliotek, bara en polyline
   normaliserad till en liten ruta. Används för aktier/fonder/portföljvärde.
*/
const Charts = {
  sparkline(values, { width = 72, height = 24, color = 'var(--gain)', strokeWidth = 1.5, responsive = false } = {}){
    const clean = values.filter(v => typeof v === 'number' && !isNaN(v));
    if(clean.length < 2){
      return `<svg width="${responsive ? '100%' : width}" height="${height}" class="sparkline sparkline-empty"></svg>`;
    }
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const range = (max - min) || 1;
    const stepX = width / (clean.length - 1);
    const pad = strokeWidth;
    const points = clean.map((v, i) => {
      const x = i * stepX;
      const y = pad + (height - pad*2) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const svgWidth = responsive ? '100%' : width;
    return `<svg width="${svgWidth}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="sparkline">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
};
