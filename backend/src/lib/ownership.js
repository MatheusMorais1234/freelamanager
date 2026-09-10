// ============================================================
// A regra de ouro: toda query filtra por userId
// ------------------------------------------------------------
// E o que impede um usuario de ler, editar ou apagar registro
// de outro. A regra e simples, mas estava escrita a mao em uns
// dez lugares - e uma regra de seguranca copiada dez vezes e
// uma regra que um dia vai ser copiada errada uma vez.
//
// O detalhe que importa: nada aqui busca o registro por id para
// depois comparar o dono. O userId entra no proprio WHERE, e a
// resposta de "existe, mas nao e seu" e a MESMA de "nao existe"
// (404). Confirmar que o id existe ja seria vazar informacao.
// ============================================================

import { prisma } from "./prisma.js";

/** O cliente existe E e deste usuario? */
export async function ownsClient(clientId, userId) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true },
  });

  return client !== null;
}

/** O contrato existe E e deste usuario? */
export async function ownsContract(contractId, userId) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
    select: { id: true },
  });

  return contract !== null;
}

/**
 * Atualiza um registro so se ele for do usuario.
 *
 * updateMany aceita filtro composto (id + userId) e devolve
 * quantas linhas mudaram - updateUnique nao aceitaria o userId
 * no where. Zero linhas significa "nao existe ou nao e seu", e
 * quem chama responde 404 nos dois casos.
 *
 * `model` e o delegate do Prisma (prisma.client, prisma.payment...).
 * Devolve true quando atualizou.
 */
export async function updateOwned(model, id, userId, data) {
  const result = await model.updateMany({ where: { id, userId }, data });
  return result.count > 0;
}

/** Mesma ideia do updateOwned, para exclusao. */
export async function deleteOwned(model, id, userId) {
  const result = await model.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
