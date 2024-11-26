(function() {
    // Check if the error handler has already been initialized
    if (window.__errorHandlerInitialized) {
        console.log('Error handler already initialized. Skipping re-initialization.');
        return;
    }
    window.__errorHandlerInitialized = true;

    // Store original console methods
    const originalConsole = {
        error: console.error,
        warn: console.warn,
        log: console.log
    };

    // Function to display error dialog
    function showErrorDialog(message, stack) {
        // Check if a dialog is already open
        if (document.querySelector('dialog[open]')) {
            console.log('Error dialog already open, skipping duplicate:', message);
            return;
        }

        const dialog = document.createElement('dialog');
        dialog.innerHTML = `
            <h2>Error Occurred</h2>
            <p><strong>Message:</strong> ${message}</p>
            <pre><code>${stack}</code></pre>
            <button>Close</button>
        `;
        dialog.querySelector('button').onclick = () => dialog.close();
        document.body.appendChild(dialog);

        // Show dialog only if the error is not suppressed
        if (window.__suppressErrorHandlerOnce || window.__suppressErrorHandlerTwice) {
            console.log('Error suppressed. Skipping this error...');
            window.__suppressErrorHandlerOnce = false; // Reset the flag
            // Handle suppression of error dialog twice
            if (window.__suppressErrorHandlerTwice) {
                console.log('Next error also suppressed.');
                window.__suppressErrorHandlerOnce = true;
                window.__suppressErrorHandlerTwice = false;
            }
        } else {
            dialog.showModal();
        }
    }

    // Function to handle errors
    function handleError(message, stack) {
        //originalConsole.error(message, stack);
        //showErrorDialog(message, stack);
    }

    // Override global error handling
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
        if (message !== "Script error." && !message.includes("Identifier") && !message.includes("has already been declared")) {
            handleError(`${message}\nSource: ${source}\nLine: ${lineno}:${colno}`, error?.stack || '');
        }
        if (originalOnError) {
            return originalOnError.apply(this, arguments);
        }
        return false; // Allow default handling
    };

    // Capture existing event listeners
    const existingErrorListener = window.listeners && window.listeners('error')[0];
    const existingUnhandledRejectionListener = window.listeners && window.listeners('unhandledrejection')[0];

    window.addEventListener('error', function(event) {
        if (event.error && !event.error.message.includes("Identifier") && !event.error.message.includes("has already been declared")) {
            handleError(event.error.message || 'Unknown error', event.error.stack || '');
        }
        if (existingErrorListener) {
            existingErrorListener(event);
        }
    }, true);

    window.addEventListener('unhandledrejection', function(event) {
        handleError('Unhandled Promise Rejection', event.reason?.stack || event.reason || '');
        if (existingUnhandledRejectionListener) {
            existingUnhandledRejectionListener(event);
        }
    });

    // Override console methods
    console.error = function(...args) {
        originalConsole.error.apply(console, args);
        handleError('Console Error', args.join(' '));
    };

    console.warn = function(...args) {
        originalConsole.warn.apply(console, args);
        handleError('Console Warning', args.join(' '));
    };

    // Expose handleError globally for manual use if needed
    window.handleError = handleError;

    // Wrap setTimeout and setInterval
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
        return originalSetTimeout(function() {
            try {
                callback.apply(this, args);
            } catch (error) {
                handleError('Error in setTimeout callback', error.stack || error.toString());
            }
        }, delay);
    };

    const originalSetInterval = window.setInterval;
    window.setInterval = function(callback, delay, ...args) {
        return originalSetInterval(function() {
            try {
                callback.apply(this, args);
            } catch (error) {
                handleError('Error in setInterval callback', error.stack || error.toString());
            }
        }, delay);
    };

    // Wrap addEventListener
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        const wrappedListener = function(event) {
            try {
                listener.call(this, event);
            } catch (error) {
                handleError(`Error in event listener for ${type}`, error.stack || error.toString());
            }
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
    };
})();