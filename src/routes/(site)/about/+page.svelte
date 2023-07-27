<svelte:head>
  <title>About Dare Me</title>
</svelte:head>

<main>
  <h1 class="logo-font">About Dare Me</h1>
  <section>
    <h2>About the Game</h2>
    <p>
      Dare Me is an adult game with an emphasis on consent and negotiation,
      designed to get the action going at any kink or sex party. It has all the
      fun of Truth or Dare or Spin the Bottle, but each player gets to curate
      their own dare pool, letting everyone relax and not worry they are going
      to be asked to do something outside their limits <em>or</em> put unwelcome
      pressure on anyone else.
    </p>
    <p>
      Dare Me is designed for both online and in-person parties. If you are
      playing online, an external video/voice call is recommended, as only text
      chat is provided in-game, and internal calling is not among the planned
      features.
    </p>
    <p>
      This is the alpha version of the game. Gameplay may be adjusted in
      response to playtesting. All features of the website are in active
      development, with additional features planned for the future. To report
      any bugs or leave feedback, visit the <a
        href="https://github.com/virtuous-cat/dare-me-svelte">Github repo</a
      >
      <!-- or
      <a href="TODO">Discord server</a> -->
      .
    </p>
  </section>
  <section>
    <h2>About the Developer</h2>
    <p>
      I am a longtime member of the BDSM community and freelance web developer.
    </p>
    <!-- <p>To hire me for a project</p>
    <p>To allow me to put more time into developing Dare Me and other projects for the community, support me at</p> -->
  </section>
</main>

<style>
  main {
    max-width: 900px;

    margin: 0 auto;
  }
  section {
    margin-block-end: 2rem;
    & > * {
      margin-block-end: 1.25rem;
    }
  }
  h1 {
    font-size: 4.75rem;
    line-height: 1;
    color: var(--accent-color);
    margin: 1.5rem 0 2rem;
    text-align: center;
  }
  p {
    line-height: 1.5;
  }
</style>
