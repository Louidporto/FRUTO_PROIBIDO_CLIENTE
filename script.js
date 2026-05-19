// --- VARIÁVEIS GLOBAIS ---
let carrinho = [];
let produtoSelecionado = null;

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

// VARIÁVEL GLOBAL COMPLEMENTAR PARA O FILTRO ATIVO
let filtroCategoriaAtual = "todos";

// Substitua essas duas funções no seu script.js

async function carregarCardapio() {
    const lista = document.getElementById('lista-itens'); 
    
    if (!lista) {
        console.error("Erro: Não encontrei o elemento 'lista-itens' no HTML");
        return;
    }
    
    // Busca os dados uma única vez ao carregar a página
    const snapshot = await database.ref('produtos').once('value');
    const produtos = snapshot.val();
    
    if (!produtos) return;
    lista.innerHTML = "";

    Object.keys(produtos).forEach(id => {
        const p = produtos[id];
        
        // Mantém apenas a regra de ignorar inativos na renderização inicial
        if (p.status !== "ativo") return;

        const precoProduto = p.valor || p.preco || 0;
        const fotoPrincipal = p.imagem ? p.imagem.split(',')[0] : 'https://via.placeholder.com/300';
        
        // Inserimos a categoria direto no atributo do HTML (data-categoria) para filtrar no cliente
        lista.innerHTML += `
            <div class="card-item-cardapio" data-categoria="${p.categoria || 'Geral'}" onclick="abrirDetalhesProduto('${id}')">
                <img src="${fotoPrincipal}" class="img-cardapio">
                <div class="info-cardapio">
                    <span class="tag-categoria-cliente">${p.categoria || 'Geral'}</span>
                    <h3>${p.nome}</h3>
                    <p class="preco-tag">R$ ${parseFloat(precoProduto).toFixed(2).replace('.',',')}</p>
                    <button class="preco-btn"><i class="fas fa-cart-plus"></i> Ver Opções</button>
                </div>
            </div>
        `;
    });
}

function filtrarCategoria(event, categoriaSelecionada) {
    // 1. Atualiza visualmente o estado dos botões de pílula
    const botoes = document.querySelectorAll('.btn-filtro');
    botoes.forEach(btn => btn.classList.remove('active'));

    if (event) {
        event.currentTarget.classList.add('active');
    }

    // 2. Filtro instantâneo no Front-End através dos elementos renderizados
    const cards = document.querySelectorAll('.card-item-cardapio');
    
    cards.forEach(card => {
        // Pega a categoria injetada diretamente no atributo customizado do card
        const categoriaCard = card.getAttribute('data-categoria');

        if (categoriaSelecionada === 'todos' || categoriaCard.toLowerCase().trim() === categoriaSelecionada.toLowerCase().trim()) {
            card.style.display = "flex"; // Mostra o card instantaneamente
        } else {
            card.style.display = "none"; // Oculta o card sem recarregar a tela
        }
    });
}

async function abrirDetalhesProduto(id) {
    const snapshot = await database.ref('produtos/' + id).once('value');
    const p = snapshot.val();
    
    if (!p) return;

    produtoSelecionado = { ...p, id: id };

    const modal = document.getElementById('modal-detalhes');
    const conteudo = document.getElementById('conteudo-detalhes');
    
    const precoProduto = p.valor || p.preco || 0;

    conteudo.innerHTML = `
        <img src="${p.imagem ? p.imagem.split(',')[0] : 'https://via.placeholder.com/300'}" class="midia-detalhes" style="width: 100%; max-height: 350px; object-fit: contain; border-radius: 12px;">
        
        <h2>${p.nome}</h2>
        <p class="preco-tag">R$ ${parseFloat(precoProduto).toFixed(2).replace('.',',')}</p>
        
        <div class="controle-quantidade" style="display: flex; align-items: center; gap: 15px; margin: 20px 0;">
            <span>Quantidade:</span>
            <button class="btn-qtd" onclick="alterarQtd(-1)" type="button">-</button>
            <span id="qtd-num">1</span>
            <button class="btn-qtd" onclick="alterarQtd(1)" type="button">+</button>
        </div>

        <div class="seletor-tamanho">
            <label>Selecione o Tamanho:</label>
            <select id="escolha-tamanho" class="input-padrao">
                <option value="Único">Tamanho Único</option>
                <option value="P">P</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="GG">GG</option>
            </select>
        </div>

        <button onclick="confirmarAdicao()" class="btn-solicitar" style="margin-top: 20px; width: 100%;">
            <i class="fas fa-shopping-cart"></i> Adicionar ao Carrinho
        </button>
    `;

    modal.style.display = "block";
}

function alterarQtd(valor) {
    let campo = document.getElementById('qtd-num');
    let atual = parseInt(campo.innerText);
    let novoValor = atual + valor;
    
    if (novoValor >= 1) {
        campo.innerText = novoValor;
    }
}

// Função de adição unificada e corrigida
function confirmarAdicao() {
    if (!produtoSelecionado) return;

    const qtd = parseInt(document.getElementById('qtd-num').innerText);
    const tamanho = document.getElementById('escolha-tamanho').value;
    const precoProduto = produtoSelecionado.valor || produtoSelecionado.preco || 0;
    
    const item = {
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        preco: parseFloat(precoProduto), 
        tamanho: tamanho,
        quantidade: qtd,
        imagem: produtoSelecionado.imagem ? produtoSelecionado.imagem.split(',')[0] : 'https://via.placeholder.com/300'
    };

    carrinho.push(item);
    localStorage.setItem('carrinho_fp', JSON.stringify(carrinho));
    
    fecharModal('modal-detalhes');
    atualizarContadorCarrinho();
    
    alert(`${qtd}x ${item.nome} (Tam: ${tamanho}) adicionado ao carrinho!`);
}

function atualizarContadorCarrinho() {
    const salvo = localStorage.getItem('carrinho_fp');
    if(salvo) carrinho = JSON.parse(salvo);

    const btn = document.getElementById('btn-carrinho-flutuante');
    const contador = document.getElementById('contador-carrinho');
    
    // Contabiliza o total de itens (somando as quantidades)
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
        listaHtml.innerHTML = "<p>Seu carrinho está vazio.</p>";
        totalHtml.innerText = "";
    } else {
        let total = 0;
        listaHtml.innerHTML = carrinho.map((item, index) => {
            const subtotalItem = item.preco * item.quantidade;
            total += subtotalItem;
            
            return `
                <div class="item-carrinho-linha" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <img src="${item.imagem}" width="40" style="border-radius: 5px;">
                    <div style="flex: 1; margin-left: 10px;">
                        <strong>${item.nome}</strong><br>
                        <small>Qtd: ${item.quantidade} | Tam: ${item.tamanho}</small>
                    </div>
                    <span style="margin-right: 10px;">R$ ${subtotalItem.toFixed(2).replace('.',',')}</span>
                    <button onclick="removerDoCarrinho(${index})" style="background: none; border: none; color: red; cursor: pointer;"><i class="fas fa-trash"></i></button>
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

async function finalizarCompraFluxoCompleto() {
    // Captura os valores dos inputs
    const nomeCliente = document.getElementById('nome-cliente-finalizar').value.trim();
    const whatsapp = document.getElementById('whatsapp-cliente-finalizar').value.replace(/\D/g, '');
    
    // 1. Validações simples
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

    // 2. Criar objeto do pedido incluindo o NOME do cliente
    const novoPedido = {
        cliente_nome: nomeCliente,
        cliente_whatsapp: whatsapp,
        itens: carrinho,
        valor_total: total,
        data: new Date().toISOString(),
        status: "pendente"
    };

    try {
        // 3. Salva no Firebase na pasta 'pedidos'
        await database.ref('pedidos').push(novoPedido);

        // 4. Prepara e envia a mensagem para o WhatsApp do vendedor (Passando o nome agora)
        enviarMensagemWhatsApp(nomeCliente, whatsapp, total);

        // 5. Limpa tudo
        carrinho = [];
        localStorage.removeItem('carrinho_fp');
        atualizarContadorCarrinho();
        fecharModal('modal-carrinho');

        // Limpa os campos do modal
        document.getElementById('nome-cliente-finalizar').value = "";
        document.getElementById('whatsapp-cliente-finalizar').value = "";

    } catch (error) {
        console.error("Erro ao salvar pedido:", error);
        alert("Erro ao processar pedido. Tente novamente.");
    }
}

// Função auxiliar para montar a mensagem (Atualizada com Nome)
function enviarMensagemWhatsApp(nomeCliente, whatsappCliente, total) {
    let mensagem = `*NOVO PEDIDO - FRUTO PROIBIDO*\n\n`;
    mensagem += `👤 *Cliente:* ${nomeCliente}\n`;
    mensagem += `📱 *WhatsApp:* ${whatsappCliente}\n`;
    mensagem += `--------------------------\n`;

    carrinho.forEach((item, i) => {
        const subtotalItem = item.preco * item.quantidade;
        mensagem += `${i+1}. *${item.quantidade}x ${item.nome}* (Tam: ${item.tamanho}) - R$ ${subtotalItem.toFixed(2)}\n`;
    });

    mensagem += `--------------------------\n`;
    mensagem += `*TOTAL: R$ ${total.toFixed(2).replace('.',',')}*\n\n`;
    mensagem += `_Pedido registrado no sistema!_`;

    const foneVendedor = "5531988712203"; 
    const url = `https://wa.me/${foneVendedor}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

async function consultarPedidosCliente() {
    const whatsappBusca = document.getElementById('telefone-busca').value.replace(/\D/g, '');
    const listaHistorico = document.getElementById('historico-pedidos');

    if (whatsappBusca.length < 10) {
        alert("Por favor, digite seu WhatsApp com DDD para buscar.");
        return;
    }

    listaHistorico.innerHTML = "<p style='text-align:center;'>Buscando seus pedidos...</p>";

    try {
        // Busca na coleção 'pedidos' filtrando pelo WhatsApp do cliente
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

        listaHistorico.innerHTML = ""; // Limpa o "Buscando..."

        // Transforma o objeto em array e inverte para mostrar o mais recente primeiro
        const listaOrdenada = Object.keys(pedidos).reverse();

        listaOrdenada.forEach(id => {
            const pedido = pedidos[id];
            const dataFormatada = new Date(pedido.data).toLocaleDateString('pt-BR');
            
            // Cria o HTML de cada pedido encontrado
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
                        <small>Itens: ${pedido.itens.map(i => i.nome).join(', ')}</small>
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
