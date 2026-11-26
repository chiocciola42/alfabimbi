import React, { useEffect, useRef } from 'react';

interface ModalDialogProps {
  /** Chiamata quando il browser chiude la finestra (Esc, gesto "indietro", tocco fuori). */
  onClose: () => void;
  /** Id del titolo visibile che dà il nome accessibile alla finestra. */
  labelledBy?: string;
  /** Nome accessibile alternativo, se non c'è un titolo visibile. */
  label?: string;
  /** Chiude anche toccando fuori dalla finestra (dove il browser lo supporta). */
  lightDismiss?: boolean;
  /** Classi della finestra stessa: sfondo, bordo, spazi interni, larghezza massima. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Finestra modale nativa (`<dialog>` aperto con `showModal()`): il browser rende inerte
 * il resto della pagina, tiene il focus dentro, gestisce Esc e il gesto "indietro" e
 * restituisce il focus a chi l'ha aperta. Va montata solo mentre è aperta.
 * Un elemento con `data-autofocus` riceve il focus all'apertura al posto del primo controllo.
 */
export const ModalDialog: React.FC<ModalDialogProps> = ({
  onClose,
  labelledBy,
  label,
  lightDismiss = false,
  className = '',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    // Chiudere prima di smontare fa tornare il focus al pulsante che aveva aperto la finestra.
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // closedby non è ancora nei tipi di React: in Safari viene ignorato e restano Esc e il pulsante Chiudi.
  const closedBy = lightDismiss ? ({ closedby: 'any' } as Record<string, string>) : {};

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-label={label}
      {...closedBy}
      onClose={() => {
        // Con StrictMode l'effetto si ripete: una chiusura di pulizia arriva a finestra già riaperta.
        if (!dialogRef.current?.open) onCloseRef.current();
      }}
      className={`m-auto text-slate-800 backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs ${className}`}
    >
      {children}
    </dialog>
  );
};
