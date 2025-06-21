export const abreviarEmpresa = (nome) => {
  if (!nome) return '';
  
  const palavrasIgnoradas = ['empresa', 'ltda', 'me', 'eireli', 'sa', 's.a.', 'comercio', 'industria', 'servicos'];
  
  const palavras = nome.split(' ').filter(palavra => 
    !palavrasIgnoradas.includes(palavra.toLowerCase().replace(/[.,]/g, ''))
  );
  
  if (palavras.length <= 2) return palavras.join(' ');
  
  if (palavras.some(p => p.length <= 3)) {
    return palavras.filter(p => p.length > 3).slice(0, 2).join(' ');
  }
  
  return palavras.slice(0, 2).join(' ');
};

export const getEmpresaSetorInfo = (conversation, empresasComSetores) => {
  let setorId = null;
  let setorNome = 'Não definido';
  
  if (conversation?.setorInfo?.id || conversation?.setorInfo?._id) {
    setorId = conversation.setorInfo.id || conversation.setorInfo._id;
    setorNome = conversation.setorInfo.nome || setorNome;
  } else if (typeof conversation?.setorId === 'object' && conversation?.setorId) {
    setorId = conversation.setorId._id || conversation.setorId.id;
    setorNome = conversation.setorId.nome || setorNome;
  } else if (typeof conversation?.setorId === 'string') {
    setorId = conversation.setorId;
  }
  
  if (!setorId || !empresasComSetores || !Array.isArray(empresasComSetores) || empresasComSetores.length === 0) {
    return {
      setor: setorNome,
      empresa: null,
      empresaAbreviada: null,
      setorId: setorId
    };
  }
  
  for (const empresa of empresasComSetores) {
    if (!empresa || typeof empresa !== 'object') continue;
    
    if (!empresa.setores || !Array.isArray(empresa.setores)) continue;
    
    const setor = empresa.setores.find(s => 
      s && (
        s.setorId === setorId || 
        s._id === setorId ||
        s.id === setorId
      )
    );
    
    if (setor) {
      return {
        setor: setor.nome || setorNome,
        empresa: empresa.nome || null,
        empresaAbreviada: empresa.nome ? abreviarEmpresa(empresa.nome) : null,
        setorId: setorId,
        empresaId: empresa._id || empresa.empresaId || null
      };
    }
  }
  
  return {
    setor: setorNome,
    empresa: null,
    empresaAbreviada: null,
    setorId: setorId
  };
};

export const getEmpresaColor = (empresaName) => {
  if (!empresaName) return null;
  
  const COLOR_PALETTE = [
    { hue: 220, name: 'blue' },
    { hue: 280, name: 'purple' },
    { hue: 340, name: 'rose' },
    { hue: 30, name: 'amber' },
    { hue: 160, name: 'emerald' },
    { hue: 200, name: 'cyan' },
    { hue: 260, name: 'indigo' },
    { hue: 0, name: 'red' },
    { hue: 180, name: 'teal' },
    { hue: 45, name: 'yellow' }
  ];
  
  const hash = empresaName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colorIndex = Math.abs(hash) % COLOR_PALETTE.length;
  const { hue, name } = COLOR_PALETTE[colorIndex];
  
  const saturation = 70;
  const lightness = 50;
  
  return {
    hue,
    name,
    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    bg: `bg-${name}-500/10`,
    text: `text-${name}-500`,
    border: `border-${name}-500/25`
  };
};