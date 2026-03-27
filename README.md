# Pokédex Lumis

Aplicação web tipo Pokédex, consumindo a PokéAPI, com busca por nome e paginação sem recarregar a página.

## Tecnologias

- Vanilla JavaScript
- Bootstrap 5
- CSS
- PokéAPI (https://pokeapi.co/)

## Como executar

Abra no navegador:

- [https://curicows.github.io/pokedex/](https://curicows.github.io/pokedex/)

## Funcionalidades

- Listagem de Pokémon consumindo `GET /pokemon` da PokéAPI
- Busca por nome (filtra localmente conforme você digita)
- Paginação exibindo `18` Pokémons por página
- Card com:
  - Tipo
  - ID em formato `#0001`
  - Sprite
  - Nome (obtido em `pokemon-species/{id}`)

