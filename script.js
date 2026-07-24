// Adicione no topo do script.js
function normalizarTexto(str) {
    if (!str) return '';
    return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, '') // Remove espaços extras
        .replace(/[^a-z0-9]/g, ''); // Remove traços/especiais se houver
}
// ==========================================================================
// 1. VARIÁVEIS GLOBAIS
// ==========================================================================
let carrinho = [];
let produtoSelecionado = null;
let tamanhoSelecionado = "";
let corSelecionada = "";
let filtroCategoriaAtual = "todos";
let filtroTamanhoAtual = "todos";   

// ==========================================================================
// 2. INICIALIZAÇÃO E CONTROLE DE SEÇÕES (ABAS)
// ==========================================================================
window.onload = function() {
    console.log("Portal iniciado...");
    
    // Força o estado inicial das seções
    const cat = document.getElementById('secao-catalogo');
    const sol = document.getElementById('secao-solicitacoes');
    
    if (cat) cat.style.display = 'block';
    if (sol) sol.style.display = 'none';

    // Carrega os produtos do Firebase
    carregarCardapio();
    atualizarContadorCarrinho();
};

function alternarSecao(secaoAlvo) {
    const secaoCatalogo = document.getElementById('secao-catalogo');
    const secaoSolicitacoes = document.getElementById('secao-solicitacoes');
    const btnCat = document.getElementById('btn-catalogo');
    const btnSol = document.getElementById('btn-solicitacoes');

    if (secaoAlvo === 'catalogo') {
        secaoCatalogo.style.setProperty('display', 'block', 'important');
        secaoSolicitacoes.style.setProperty('display', 'none', 'important');
        btnCat.classList.add('active');
        btnSol.classList.remove('active');
    } else {
        secaoCatalogo.style.setProperty('display', 'none', 'important');
        secaoSolicitacoes.style.setProperty('display', 'block', 'important');
        btnCat.classList.remove('active');
        btnSol.classList.add('active');
    }
}

// ==========================================================================
// 3. VITRINE DE PRODUTOS E FILTROS
// ==========================================================================
async function carregarCardapio() {
    // Apenas aciona a função centralizada que busca e filtra os itens em tempo real
    aplicarFiltrosCruzados();
}

// Função ajustada para receber o evento e a categoria de forma correta
function filtrarCategoria(event, categoria) {
    filtroCategoriaAtual = categoria;

    // Atualiza a classe ativa nos botões de categoria
    const botoes = document.querySelectorAll('.btn-filtro');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    aplicarFiltrosCruzados();
}

// Função para gerenciar o clique no filtro de tamanho
function filtrarPorTamanho(tamanho, botao) {
    filtroTamanhoAtual = tamanho;

    // Atualiza a classe ativa nos botões de tamanho
    const botoesTamanho = document.querySelectorAll('.btn-filtro-tam');
    botoesTamanho.forEach(btn => btn.classList.remove('active'));
    if (botao) botao.classList.add('active');

    aplicarFiltrosCruzados();
}

// Função centralizada que lê o Firebase e aplica os filtros no ID correto ('lista-itens')
function aplicarFiltrosCruzados() {
    const vitrine = document.getElementById('lista-itens'); 
    if (!vitrine) {
        console.error("Erro: Elemento 'lista-itens' não foi encontrado.");
        return;
    }

    database.ref('produtos').once('value', (snapshot) => {
        const produtos = snapshot.val();
        vitrine.innerHTML = "";
        
        let produtosExibidos = 0;

        if (produtos) {
            Object.keys(produtos).forEach(id => {
                const p = produtos[id];
                
                // 1. Ignora produtos nulos ou inativos
                if (!p || p.status !== "ativo") return;
                
                // 2. Validação da Categoria
                const bateCategoria = (filtroCategoriaAtual === 'todos' || p.categoria === filtroCategoriaAtual);
                
                // 3. Validação do Tamanho com proteção contra dados corrompidos
                let bateTamanho = false;
                if (filtroTamanhoAtual === 'todos') {
                    bateTamanho = true;
                } else if (p.tamanhos) {
                    try {
                        const stringTamanhos = String(p.tamanhos);
                        const listaTamanhos = stringTamanhos.split(',').map(t => t.trim().toUpperCase());
                        bateTamanho = listaTamanhos.includes(filtroTamanhoAtual.toUpperCase());
                    } catch (err) {
                        console.error("Erro ao ler tamanhos do produto ID " + id, err);
                        bateTamanho = false;
                    }
                }

                // Se passar nos filtros, renderiza o card
                if (bateCategoria && bateTamanho) {
                    const precoProduto = p.valor || p.preco || 0;
                    const fotoPrincipal = p.imagem ? p.imagem.split(',')[0] : 'https://via.placeholder.com/300';

                    vitrine.innerHTML += `
                        <div class="card-item-cardapio" data-categoria="${p.categoria || 'Geral'}" onclick="abrirDetalhesProduto('${id}')">
                            <img src="${fotoPrincipal}" class="img-cardapio">
                            <div class="info-cardapio">
                                <span class="tag-categoria-cliente">${p.categoria || 'Geral'}</span>
                                <h3 class="nome-produto">${p.nome || 'Produto sem nome'}</h3>
                                <h3 class="descricao-curta">${p.descricao || 'Produto sem descriçao'}</h3>
                                <p class="preco-tag">R$ ${parseFloat(precoProduto).toFixed(2).replace('.',',')}</p>
                                <button class="preco-btn"><i class="fas fa-cart-plus"></i> Ver Opções</button>
                            </div>
                        </div>
                    `;
                    produtosExibidos++;
                }
            });
        }

        if (produtosExibidos === 0) {
            vitrine.innerHTML = "<p class='aviso'>Nenhum produto encontrado para os filtros selecionados.</p>";
        }
    });
}

// ==========================================================================
// 4. DETALHES DO PRODUTO E SELEÇÃO DE VARIAÇÕES
// ==========================================================================
async function abrirDetalhesProduto(id) {
    const snapshot = await database.ref('produtos/' + id).once('value');
    const p = snapshot.val();
    
    if (!p) return;

    produtoSelecionado = { ...p, id: id };

    const modal = document.getElementById('modal-detalhes');
    const conteudo = document.getElementById('conteudo-detalhes');
    const precoProduto = p.valor || p.preco || 0;

    // --- LOGICA DO CARROSSEL DE IMAGENS ---
    // Separa as imagens por vírgula. Se não houver nenhuma, usa o placeholder
    const listaImagens = p.imagem ? p.imagem.split(',').map(img => img.trim()) : ['https://via.placeholder.com/300'];
    
    // Gera o HTML de cada imagem dentro do container do slider
    const imagensHtml = listaImagens.map((imgUrl, index) => `
        <img src="${imgUrl}" class="slide-foto ${index === 0 ? 'active' : ''}" data-index="${index}">
    `).join('');

    // Se tiver mais de uma imagem, exibe as setas de navegação e os pontinhos (dots)
    let controlesCarrosselHtml = "";
    if (listaImagens.length > 1) {
        const pontinhosHtml = listaImagens.map((_, index) => `
            <span class="dot ${index === 0 ? 'active' : ''}" onclick="mudarSlideDinamico(${index})"></span>
        `).join('');

        controlesCarrosselHtml = `
            <button class="seta-carrossel seta-esquerda" onclick="navegarSlide(-1)">&#10094;</button>
            <button class="seta-carrossel seta-direita" onclick="navegarSlide(1)">&#10095;</button>
            <div class="container-dots">${pontinhosHtml}</div>
        `;
    }
    // --------------------------------------

    conteudo.innerHTML = `
        <div class="carrossel-container">
            <div class="slider-wrapper">
                ${imagensHtml}
            </div>
            ${controlesCarrosselHtml}
        </div>
        
        <h2>${p.nome}</h2>
        <p class="preco-tag">R$ ${parseFloat(precoProduto).toFixed(2).replace('.',',')}</p>
        
        <div class="controle-quantidade" style="display: flex; align-items: center; gap: 15px; margin: 20px 0;">
            <span>Quantidade:</span>
            <button class="btn-qtd" onclick="alterarQtd(-1)" type="button">-</button>
            <span id="qtd-num">1</span>
            <button class="btn-qtd" onclick="alterarQtd(1)" type="button">+</button>
        </div>

        <div class="secao-variacoes">
            <div class="variacao-grupo">
                <label>Escolha o Tamanho:</label>
                <div id="container-tamanhos-cliente" class="opcoes-flex"></div>
            </div>

            <div class="variacao-grupo" style="margin-top: 15px;">
                <label>Escolha a Cor:</label>
                <div id="container-cores-cliente" class="opcoes-flex"></div>
            </div>
        </div>

        <button onclick="confirmarAdicao()" class="btn-solicitar" style="margin-top: 20px; width: 100%;">
            <i class="fas fa-shopping-cart"></i> Adicionar ao Carrinho
        </button>
    `;

    exibirDetalhesNoModal(produtoSelecionado);
    modal.style.display = "block";
}

let slideIndexAtual = 0;

function navegarSlide(direcao) {
    const slides = document.querySelectorAll('.slide-foto');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;

    // Remove a classe ativa do slide atual
    slides[slideIndexAtual].classList.remove('active');
    if (dots.length > 0) dots[slideIndexAtual].classList.remove('active');

    // Calcula o próximo index
    slideIndexAtual += direcao;

    // Se passar do fim, volta para o início. Se for menor que zero, vai para o fim.
    if (slideIndexAtual >= slides.length) slideIndexAtual = 0;
    if (slideIndexAtual < 0) slideIndexAtual = slides.length - 1;

    // Adiciona a classe ativa no novo slide
    slides[slideIndexAtual].classList.add('active');
    if (dots.length > 0) dots[slideIndexAtual].classList.add('active');
}

function mudarSlideDinamico(index) {
    const slides = document.querySelectorAll('.slide-foto');
    const dots = document.querySelectorAll('.dot');
    
    slides[slideIndexAtual].classList.remove('active');
    if (dots.length > 0) dots[slideIndexAtual].classList.remove('active');

    slideIndexAtual = index;

    slides[slideIndexAtual].classList.add('active');
    if (dots.length > 0) dots[slideIndexAtual].classList.add('active');
}

function exibirDetalhesNoModal(produto) {
    tamanhoSelecionado = "";
    corSelecionada = "";

    const containerTamanhos = document.getElementById('container-tamanhos-cliente');
    if (containerTamanhos) {
        containerTamanhos.innerHTML = "";
        if (produto.tamanhos && String(produto.tamanhos).trim() !== "") {
            String(produto.tamanhos).split(',').forEach(tam => {
                const t = tam.trim();
                containerTamanhos.innerHTML += `
                    <button class="pilula-opcao" onclick="selecionarTamanho(this, '${t}')">${t}</button>
                `;
            });
        } else {
            containerTamanhos.innerHTML = `<span style="color:#777">Tamanho Único (U)</span>`;
            tamanhoSelecionado = "U";
        }
    }

    const containerCores = document.getElementById('container-cores-cliente');
    if (containerCores) {
        containerCores.innerHTML = "";
        if (produto.cores && String(produto.cores).trim() !== "") {
            String(produto.cores).split(',').forEach(cor => {
                const c = cor.trim();
                const corEstilo = traduzirCorParaCss(c); 
                containerCores.innerHTML += `
                    <button class="bola-cor" style="background-color: ${corEstilo};" title="${c}" onclick="selecionarCor(this, '${c}')"></button>
                `;
            });
        } else {
            containerCores.innerHTML = `<span style="color:#777">Cor Única</span>`;
            corSelecionada = "Única";
        }
    }
}

function selecionarTamanho(elemento, valor) {
    document.querySelectorAll('.pilula-opcao').forEach(el => el.classList.remove('active'));
    elemento.classList.add('active');
    tamanhoSelecionado = valor;
}

function selecionarCor(elemento, valor) {
    document.querySelectorAll('.bola-cor').forEach(el => el.classList.remove('active'));
    elemento.classList.add('active');
    corSelecionada = valor;
}

// CORREÇÃO: Função fechada corretamente e a retornar o valor padrão caso não encontre correspondência
function traduzirCorParaCss(cor) {
    const coresTraduzidas = {
        'preto': '#000000', 'branco': '#ffffff', 'vermelho': '#e74c3c', 
        'azul': '#3498db', 'rosa': '#ffc0cb', 'pink': '#ff69b4', 
        'vinho': '#7b001c', 'bege': '#f5f5dc', 'amarelo': '#f1c40f'
    };
    const c = cor.toLowerCase().trim();
    return coresTraduzidas[c] || cor;
}

function alterarQtd(valor) {
    let campo = document.getElementById('qtd-num');
    let atual = parseInt(campo.innerText);
    let novoValor = atual + valor;
    
    if (novoValor >= 1) {
        campo.innerText = novoValor;
    }
}

// ==========================================================================
// 5. GERENCIAMENTO DO CARRINHO DE COMPRAS
// ==========================================================================
function confirmarAdicao() {
    if (!produtoSelecionado) return;

    const qtd = parseInt(document.getElementById('qtd-num').innerText) || 1;

    if (produtoSelecionado.tamanhos && String(produtoSelecionado.tamanhos).trim() !== "" && !tamanhoSelecionado) {
        alert("Por favor, selecione um tamanho antes de adicionar ao carrinho!");
        return;
    }
    if (produtoSelecionado.cores && String(produtoSelecionado.cores).trim() !== "" && !corSelecionada) {
        alert("Por favor, selecione uma cor antes de adicionar ao carrinho!");
        return;
    }

    const tamFinal = tamanhoSelecionado || "U";
    const corFinal = corSelecionada || "Única";

    const itemCarrinho = {
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        preco: produtoSelecionado.valor || produtoSelecionado.preco || 0,
        imagem: produtoSelecionado.imagem ? produtoSelecionado.imagem.split(',')[0] : 'https://via.placeholder.com/300',
        quantidade: qtd,
        tamanho: tamFinal,
        cor: corFinal
    };

    carrinho.push(itemCarrinho);
    localStorage.setItem('carrinho_fp', JSON.stringify(carrinho));
    
    fecharModal('modal-detalhes');
    atualizarContadorCarrinho();
    
    alert(`${qtd}x ${itemCarrinho.nome} (Tam: ${tamFinal} | Cor: ${corFinal}) adicionado ao carrinho!`);
}

function atualizarContadorCarrinho() {
    const salvo = localStorage.getItem('carrinho_fp');
    if(salvo) carrinho = JSON.parse(salvo);

    const btn = document.getElementById('btn-carrinho-flutuante');
    const contador = document.getElementById('contador-carrinho');
    
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    
    if (totalItens > 0) {
        if (btn) btn.style.display = "flex";
        if (contador) contador.innerText = totalItens;
    } else {
        if (btn) btn.style.display = "none";
    }
}

function abrirCarrinho() {
    const modal = document.getElementById('modal-carrinho');
    const listaHtml = document.getElementById('itens-carrinho');
    const totalHtml = document.getElementById('total-carrinho');
    
    if (carrinho.length === 0) {
        listaHtml.innerHTML = "<p style='text-align: center; padding: 20px; color: #666;'>Seu carrinho está vazio.</p>";
        totalHtml.innerText = "";
    } else {
        let total = 0;
        listaHtml.innerHTML = carrinho.map((item, index) => {
            const subtotalItem = item.preco * item.quantidade;
            total += subtotalItem;
            
            return `            
                <div class="item-carrinho-linha">
                    <img src="${item.imagem}" class="img-carrinho-thumb" style="width: 45px; height: 45px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
                    
                    <div class="detalhes-item-carrinho" style="flex: 1; min-width: 0; padding: 0 5px;">
                        <h4 style="margin: 0; font-size: 0.85rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${item.nome}
                        </h4>
                        <small style="color: #777; display: block; margin: 1px 0; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            Tam: <strong>${item.tamanho}</strong> | Cor: <strong>${item.cor}</strong>
                        </small>
                        <p style="margin: 0; font-weight: 600; color: var(--primary-blue); font-size: 0.85rem;">
                            R$ ${parseFloat(item.preco).toFixed(2).replace('.', ',')} <span style="font-weight: normal; color: #888; font-size: 0.75rem;">x ${item.quantidade}</span>
                        </p>
                    </div>
                    
                    <div class="acoes-item-carrinho" style="flex-shrink: 0; width: 30px; text-align: right;">
                        <i class="fas fa-trash-alt" style="color: var(--danger-red); cursor: pointer; font-size: 0.95rem; padding: 5px;" onclick="removerDoCarrinho(${index})"></i>
                    </div>
                </div>
            `;
        }).join('');
        totalHtml.innerHTML = `<strong>Total: R$ ${total.toFixed(2).replace('.',',')}</strong>`;
    }
    modal.style.display = "block";
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    localStorage.setItem('carrinho_fp', JSON.stringify(carrinho));
    abrirCarrinho();
    atualizarContadorCarrinho();
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

// ==========================================================================
// 6. FINALIZAÇÃO DE COMPRA E ENVIO PARA O WHATSAPP
// ==========================================================================
async function finalizarCompraFluxoCompleto() {
    const nomeCliente = document.getElementById('nome-cliente-finalizar').value.trim();
    const whatsapp = document.getElementById('whatsapp-cliente-finalizar').value.replace(/\D/g, '');
    
    if (nomeCliente.length < 3) {
        alert("Por favor, insira seu nome para identificarmos o pedido!");
        return;
    }

    if (whatsapp.length < 10) {
        alert("Por favor, insira um WhatsApp válido (com DDD) para consultar seu pedido depois!");
        return;
    }

    if (carrinho.length === 0) return;

    let total = 0;
    carrinho.forEach(item => total += (item.preco * item.quantidade));

    const novoPedido = {
        cliente_nome: nomeCliente,
        cliente_whatsapp: whatsapp,
        itens: carrinho,
        valor_total: total,
        data: new Date().toISOString(),
        status: "pendente"
    };

    try {
        await database.ref('pedidos').push(novoPedido);
        enviarMensagemWhatsApp(nomeCliente, whatsapp, total, carrinho);

        carrinho = [];
        localStorage.removeItem('carrinho_fp');
        atualizarContadorCarrinho();
        fecharModal('modal-carrinho');

        document.getElementById('nome-cliente-finalizar').value = "";
        document.getElementById('whatsapp-cliente-finalizar').value = "";

    } catch (error) {
        console.error("Erro ao salvar pedido:", error);
        alert("Erro ao processar pedido. Tente novamente.");
    }
}

function enviarMensagemWhatsApp(nomeCliente, whatsappCliente, total, itensEnviados) {
    let mensagem = `*NOVO PEDIDO - FRUTO PROIBIDO*\n\n`;
    mensagem += `👤 *Cliente:* ${nomeCliente}\n`;
    mensagem += `📱 *WhatsApp:* ${whatsappCliente}\n`;
    mensagem += `--------------------------\n`;

    itensEnviados.forEach((item, i) => {
        const subtotalItem = item.preco * item.quantidade;
        mensagem += `${i+1}. *${item.quantidade}x ${item.nome}*\n   - Tam: ${item.tamanho} | Cor: ${item.cor}\n   - Valor: R$ ${subtotalItem.toFixed(2).replace('.', ',')}\n\n`;
    });

    mensagem += `--------------------------\n`;
    mensagem += `*TOTAL: R$ ${total.toFixed(2).replace('.',',')}*\n\n`;
    mensagem += `_Pedido registrado no sistema!_`;

    const foneVendedor = "5531988712203"; 
    const url = `https://wa.me/${foneVendedor}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// ==========================================================================
// 7. CONSULTA HISTÓRICO DE PEDIDOS DO CLIENTE
// ==========================================================================
async function consultarPedidosCliente() {
    const whatsappBusca = document.getElementById('telefone-busca').value.replace(/\D/g, '');
    const listaHistorico = document.getElementById('historico-pedidos');

    if (whatsappBusca.length < 10) {
        alert("Por favor, digite seu WhatsApp com DDD para buscar.");
        return;
    }

    listaHistorico.innerHTML = "<p style='text-align:center;'>Buscando seus pedidos...</p>";

    try {
        const snapshot = await database.ref('pedidos')
            .orderByChild('cliente_whatsapp')
            .equalTo(whatsappBusca)
            .once('value');

        const pedidos = snapshot.val();

        if (!pedidos) {
            listaHistorico.innerHTML = `
                <div class="card-pedido-cliente" style="border-left-color: #e74c3c; text-align:center;">
                    <p>Nenhum pedido encontrado para este número.</p>
                    <small>Verifique se digitou o número corretamente ou se já finalizou alguma compra.</small>
                </div>`;
            return;
        }

        listaHistorico.innerHTML = ""; 

        const listaOrdenada = Object.keys(pedidos).reverse();

        listaOrdenada.forEach(id => {
            const pedido = pedidos[id];
            const dataFormatada = new Date(pedido.data).toLocaleDateString('pt-BR');
            
            listaHistorico.innerHTML += `
                <div class="card-pedido-cliente">
                    <div class="pedido-header">
                        <span><strong>Pedido:</strong> #${id.slice(-5).toUpperCase()}</span>
                        <span class="status-badge status-${pedido.status || 'pendente'}">
                            ${(pedido.status || 'pendente').toUpperCase()}
                        </span>
                    </div>
                    <div class="pedido-corpo">
                        <p><i class="far fa-calendar-alt"></i> Data: ${dataFormatada}</p>
                        <p><i class="fas fa-coins"></i> Total: <strong>R$ ${pedido.valor_total.toFixed(2).replace('.', ',')}</strong></p>
                        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">
                        <small>Itens: ${pedido.itens.map(i => `${i.nome} (${i.tamanho}/${i.cor})`).join(', ')}</small>
                    </div>
                    <div class="barra-progresso">
                        <div class="progresso-preenchido" style="width: ${pedido.status === 'pendente' ? '30%' : '100%'}"></div>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Erro na busca:", error);
        listaHistorico.innerHTML = "<p>Erro ao conectar com o servidor. Tente novamente.</p>";
    }
}
