# 📈 DynamoDB - tipos de filtros

## 🧭 Contexto

#### 🔍 Diferença entre GSI, LSI e o papel de Span no processo de filtro do DynamoDB

#### 🧩 LSI (Local Secondary Index)

O Local Secondary Index é um índice local ao partition key da tabela principal.Ele permite criar diferentes chaves de ordenação (sort keys) para a mesma chave de partição.

Características principais:

- A chave de partição é a mesma da tabela base.

- Pode ter uma sort key diferente, permitindo novas formas de ordenação e filtro.

- É criado junto com a tabela (não pode ser adicionado depois).

- Garante consistência forte nas leituras (ConsistentRead: true é permitido).

- Compartilha o mesmo throughput da tabela principal.

Uso típico:

Ideal quando você precisa de diferentes visões ordenadas sobre os mesmos itens, por exemplo:

Tabela principal:  userId (PK), createdAt (SK)
LSI:               userId (PK), amount (SK)


Permite consultar todos os registros de um usuário, agora ordenados por amount em vez de por data.

---

#### 🌎 GSI (Global Secondary Index)

O Global Secondary Index é um índice independente da tabela principal. Ele permite definir novas chaves de partição e ordenação, o que possibilita consultas com outras perspectivas sobre os dados.

Características principais:

- Possui sua própria chave de partição e sort key (podem ser diferentes das originais).

- Pode ser adicionado depois que a tabela já existe.

- Mantém cópias parciais dos dados (só os atributos projetados).

- Não suporta leitura fortemente consistente.

- Possui throughput separado (WCU/RCU próprios).

Uso típico:
Ideal quando você precisa consultar a tabela por outros atributos, por exemplo:

Tabela principal:  userId (PK), createdAt (SK)
GSI:               status (PK), amount (SK)


Assim, você pode buscar todos os registros com status = "APPROVED" e amount BETWEEN 100 AND 500.

---

#### 🧮 Span no processo de filtro

O termo Span (ou intervalo) no contexto de filtros do DynamoDB normalmente se refere ao intervalo de valores que uma consulta percorre na sort key ou índice.

Quando se usa um BETWEEN, > ou < na sort key dentro do KeyConditionExpression, o DynamoDB cria um "span" de varredura — ou seja, ele lê apenas os itens dentro desse intervalo, sem precisar varrer toda a partição.

Exemplo com span:

```yaml
  KeyConditionExpression: "userId = :uid AND createdAt BETWEEN :start AND :end"
```

➡️ O DynamoDB só examina o span de chaves createdAt entre :start e :end, o que é altamente eficiente.

Já quando o filtro é aplicado em atributos não indexados, o DynamoDB varre todos os itens da partição (ou índice) e aplica o filtro após a leitura, o que aumenta o custo e o tempo da query.

---

## ⚙️ Desenvolvimento

#### `Busca pela primary key`
Essa busca usa a chave primária quando houve a criação da tabela.

Esse tipo de filtro, pela primary key, realiza o filtro direto na partição do DynamoDB e também retorna somente os objetos que atendem ao filtro.

<img width="456" height="666" alt="image" src="https://github.com/user-attachments/assets/43769b08-10a5-4619-85f3-8214df00da58" />

Log gerado: `{"type":"PRIMARY KEY","scan":1}` | É possível notar que retornou somente 1 objeto para a memória.

---

#### `Busca pela primary key e sorted key (LSI)`
Essa busca usa a chave primária e pela sorted key quando houve a criação da tabela.

Esse tipo de filtro também realiza o filtro direto na partição do DynamoDB e também retorna somente os objetos que atendem ao filtro.

<img width="497" height="669" alt="image" src="https://github.com/user-attachments/assets/c62322c1-7351-4a20-bf73-debbe2b35ea7" />

Log gerado: `{"type":"PRIMARY KEY AND SORTED KEY - LSI","scan":1}` | É possível notar que retornou somente 1 objeto para a memória.

---

#### `Busca pelo index global (GSI)`
Essa busca usa o index global, que pode ser criado posteriormente à criação da tabela e pode estar relacionado a qualquer atributo.

Esse tipo de filtro também retorna somente os objetos que atendem ao filtro.

<img width="568" height="871" alt="image" src="https://github.com/user-attachments/assets/03acad73-e3f1-40ef-918f-f0a7431a46ce" />

Log gerado: `{"type":"GSI","scan":2}` | É possível notar que retornou somente 2 objetos para a memória (que atendem ao filtro).

---

#### `Busca usando o filter expression`
Essa busca usa o scan, que retorna todos os objetos que atendem ao filtro referente a `Key Expression` e posteriormente realiza outro filtro em memória para atender a condição do  `Filter Expression`.

<img width="595" height="432" alt="image" src="https://github.com/user-attachments/assets/aa432613-97af-4d92-8393-cab4bf258042" />
<img width="503" height="695" alt="image" src="https://github.com/user-attachments/assets/f9ab9cf9-7c7e-498f-947a-47cafa540280" />

Logs gerados: `{"type":"SCAN","scan":5}`  | É possível notar que retornou todos os objetos que atendem ao `Key expression` para a memória e posteriormente filtrou pela condição presente no `Filter expression`.
