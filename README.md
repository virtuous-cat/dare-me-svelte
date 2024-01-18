# Dare Me

A party game for adults with an emphasis on consent and negotiation. All the fun of Truth or Dare, but each player gets to curate their own dare pool.

https://www.daremegame.party/

## Technology

This app is built with Svelte and SvelteKit for the front-end and dare management API, and connected to a Node.js back-end running a [Socket.IO](https://socket.io/) web socket server for the game events, as described in this [blog post](https://joyofcode.xyz/using-websockets-with-sveltekit) by Joy of Code.

The dare list is stored in a PostgreSQL database with [Prisma](https://www.prisma.io/) and [Zod](https://zod.dev/) for management and type safety. Redis is used for the game state data via [ioredis](https://github.com/redis/ioredis/tree/main).

### The Dare List

The dare list can be accessed both in the game and as a stand-alone page on the site to allow users to view and add dares while not in a game.

The dare list UI allows users to filter dares by category and interaction type, as well as by tag, and to search the full text and tags. In admin mode, they can also be filtered by status, and edited both individually and en masse. The search and filter logic is currently implemented on the front-end, but will be moved to the backend in the future. Pagination is also planned for a future update.

Users can add new dares to the dare list, both singly and in batches, as well as add new variants of existing dares, which are grouped in an expandible section under their parent dares in the list. (Variant dares are intended to allow the addition of small changes to dares to allow customization without cluttering the dare list with near duplicates.) User-added dares are marked as pending and only added to the public dare list after review.

### The Game

The game UI is not yet available on the public site, but consists of four panels, Players, Game Log, Your Dares, and Chat, as well as a highlighted Current Game Activity box, and a dare management modal. The panels are arranged in a bento style layout on wider screens and as tabbed screens controlled by a bottom bar on narrower screens using a combination of CSS grid and flexbox, as well as the new [Container Query API](https://developer.mozilla.org/en-US/docs/Web/CSS/@container) and container units, polyfilled by [PostCSS](https://postcss.org/).

The gameplay loop is orchestrated through a series of web socket events. After the players have chosen 3-10 dares, including at least 2 Solo dares, which are dares not preformed with a specific partner, each player has a turn as the darer. They spin to determine which other player they will select a dare for. This "spinning" is semi-random, using a Lua script within Redis to select a player who is ready, was not selected last turn, and has not had more than the ceiling of the mean number of daree turns for the group. The darer then selects on of the daree's curated dares for them to preform. If the darer chooses a Partnered dare (one that would include the darer), the daree then has the option to accept, decline and have the darer choose one of the daree's Solo dares instead, or counter-offer with a different Partnered dare (either their own or the darer's). If a counter-offer is proposed, the darer can either accept it or pick one of the daree's Solo dares instead. The final selected dare is then preformed and new turn begins when both player have clicked their end turn buttons.
