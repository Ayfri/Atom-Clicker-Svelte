<script>
	const site = 'https://atom-clicker.ayfri.com';
	const name = 'Atom Clicker';
	const author = 'Ayfri';
	const description =
		'Atom Clicker is an addictive incremental game where you collect atoms, unlock powerful upgrades, and boost your production rates.';

	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'Game',
		name: name,
		author: {
			'@type': 'Person',
			name: author,
		},
		description: description,
		url: site,
		image: `${site}/atom.png`,
		genre: ['Incremental', 'Clicker', 'Idle'],
		operatingSystem: 'All',
		publisher: author,
		sourceOrganization: {
			'@type': 'Organization',
			name: author,
			url: site,
		},
	};
</script>

<svelte:head>
	<meta lang="en" />
	<meta name="description" content={description} />
	<meta name="keywords" content="clicker,incremental,game,atoms" />
	<meta name="author" content={author} />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="theme-color" content="#4a90e2" />

	<link rel="icon" type="image/png" href="/atom.png" />

	<meta property="og:title" content={name} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="/atom.png" />
	<meta property="og:url" content={site} />
	<meta property="og:type" content="website" />

	<meta name="twitter:card" content="summary" />
	<meta name="twitter:creator" content={author} />
	<meta name="twitter:site" content={site} />
	<meta name="twitter:title" content={name} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content="/atom.png" />

	<meta name="canonical" content={site} />
	<meta name="robots" content="index, follow" />
	<meta name="language" content="en" />

	<title>{name}</title>
	
	{@html `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`}
</svelte:head>
