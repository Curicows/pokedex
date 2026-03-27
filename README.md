# Pokédex Lumis

Aplicação web tipo Pokédex, consumindo a PokéAPI, com busca por nome e paginação sem recarregar a página.

## Tecnologias

- Vanilla JavaScript
- Bootstrap 5
- CSS
- PokéAPI (https://pokeapi.co/)

## Como executar

Este projeto usa caminhos absolutos no HTML (`/css/...`, `/assets/...`, `/js/...`), então rode um servidor apontando para a raiz do repositório.

1. Na pasta do projeto (`pokedex`), execute:
   - `python -m http.server 8080`
2. Abra no navegador:
   - http://localhost:8080/

## Funcionalidades

- Listagem de Pokémon consumindo `GET /pokemon` da PokéAPI
- Busca por nome (filtra localmente conforme você digita)
- Paginação exibindo `18` Pokémons por página
- Card com:
  - Tipo
  - ID em formato `#0001`
  - Sprite
  - Nome (obtido em `pokemon-species/{id}`)

