import React, { useEffect, useRef, useState } from 'react';
import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonFooter, useIonViewDidEnter, IonBackButton, IonAlert, IonMenu, IonToast, IonIcon, IonItem, IonLabel, IonToggle, IonInput, IonDatetime, IonSelectOption, IonSelect, IonDatetimeButton, IonModal } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../firebase/AuthContext';
import { 
  deleteLastEventByJobID, 
  subscribeToJobs, 
  updateJobEventDatesByNumberID, 
  updateShippingDate, 
  editSiteInfoDocument,
  updateArrayElement,
  removeArrayElement,
  getCalendarNames,
  addCalendarName,
  removeCalendarName,
} from '../../firebase/controller';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { menuController } from '@ionic/core/components';
import { refreshOutline } from 'ionicons/icons';
import './Calendar.css';

interface Job {
  jobID: number;
  title: string;
  backgroundColor: string;
  eventDates: string[];
  eventHours: number[];
  hours: number;
  shippingDate: string;
  calendarName:string;
}

interface CalendarEvent {
  jobID: number;
  title: string;
  date: string;
  backgroundColor: string;
}

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('');

  const [myTitle, setMyTitle] = useState('');
  const [myJobNumber, setMyJobNumber] = useState(0);
  const [myJobDate, setMyJobDate] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState<string>('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [calendarNameToDelete, setCalendarNameToDelete] = useState<string | null>(null);

  // New Job useStates, should be made into an object at some point
  const [newJobSelectedDate, setNewJobSelectedDate] = useState<string | null>('');
  const [newJobTitle, setNewJobTitle] = useState<string>('');
  const [newJobTotalHours, setNewJobTotalHours] = useState<number>(0);
  const [newJobPerDayHours, setNewJobPerDayHours] = useState<number>(0);
  const [newJobColor, setNewJobColor] = useState<string>(''); // Adjusted for single select
  const [newJobShippingDate, setNewJobShippingDate] = useState<string | null>(null);
  const [newJobInHandDate, setNewJobInHandDate] = useState<string | null>(null);
  const [newJobCalendar, setNewJobCalendar] = useState<string>(''); // Adjusted for single select
  const [newJobScheduled, setNewJobScheduled] = useState<boolean>(true);
  const [newJobEndDate, setNewJobEndDate] = useState<boolean>(false);
  const [showShippingCalendar, setShowShippingCalendar] = useState<boolean>(false);
  const [showInHandCalendar, setShowInHandCalendar] = useState<boolean>(false);

  const calendarColors = ['Blue','Green','Purple','Pink','Orange','Yellow','Red','Light Blue','Light Green','Light Purple','Light Pink','Light Orange','Light Yellow','Light Red']

  // New state for managing calendar names and toggles
  const [calendarNames, setCalendarNames] = useState<string[]>([]);
  const [activeCalendars, setActiveCalendars] = useState<{[key: string]: boolean}>({});

  useIonViewDidEnter(() => {
    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) { calendarApi.updateSize(); calendarApi.gotoDate(new Date()); }
    }, 200);
  });

  const handleLogout = async () => {
    try { await signOut(auth); history.push('/login');
    } catch (error) { console.error('Error signing out:', error); }
  };

  const handleTodayButtonClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) { calendarApi.today(); }
  };

  //////////////////////////////  REAL TIME UPDATING  //////////////////////////////
  useEffect(() => {
    const unsubscribe = subscribeToJobs((jobs) => {
      setMyJobs(jobs);
      // updateEventsFromJobs(jobs);
    });

    return () => unsubscribe();
  }, []);

  //////////////////////////////  CALENDAR NAMES  //////////////////////////////
  useEffect(() => {
    getCalendarNames().then((names) => {
      setCalendarNames(names);
      
      // Initialize all calendars as active
      const initialActiveState = names.reduce((acc, name) => ({ ...acc, [name]: true }), {});
      setActiveCalendars(initialActiveState);
    }).catch((error) => {
      console.error("Error fetching calendar names:", error);
    });
  }, [refresh]);

  const refreshButtonClicked = () => {
    setRefresh(prevRefresh => !prevRefresh);
  }

    const handleAddCalendar = async () => {
    if (newCalendarName.trim() !== '') {
      await addCalendarName(newCalendarName.trim());

      // Optionally update local state or refetch the calendar names
      setCalendarNames((prevNames) => [...prevNames, newCalendarName.trim()]);
      setNewCalendarName(''); // Clear the input field after adding
    }
  };

  const handleDeleteCalendar = (name: string) => {
    setCalendarNameToDelete(name);
    setShowDeleteAlert(true);
  };

  const confirmDeleteCalendar = async () => {
    if (calendarNameToDelete) {
      try {
        await removeCalendarName(calendarNameToDelete);
        setCalendarNames((current) =>
          current.filter((calendarName) => calendarName !== calendarNameToDelete)
        );
        console.log(`Deleted calendar name: ${calendarNameToDelete}`);
      } catch (error) {
        console.error("Error deleting calendar name:", error);
      }
      setCalendarNameToDelete(null);
    }
    setShowDeleteAlert(false);
  };

  const cancelDeleteCalendar = () => {
    setCalendarNameToDelete(null);
    setShowDeleteAlert(false);
  };

  //////////////////////////////  FILTER OUT CALENDARS  //////////////////////////////
  interface Event { 
    jobID: number; 
    title: string; 
    date: string; 
    backgroundColor: string;
  }

  useEffect(() => {
    const isShippingActive = activeCalendars['shipping'];

    // Explicitly typing regularEvents as Event[]
    const regularEvents: Event[] = myJobs.reduce((acc: Event[], job) => {
      let remainingHours = job.hours;

      // Create expanded events for regular events
      const expandedEvents = job.eventDates.map((date, index) => {
        const eventHour = job.eventHours[index];
        const applicableHours = Math.min(eventHour, remainingHours);
        const eventTitle = `${job.title} : ${applicableHours} / ${remainingHours}`;

        if (remainingHours >= applicableHours) {
          remainingHours -= applicableHours;
        }

        return {
          jobID: job.jobID,
          title: eventTitle,
          date,
          backgroundColor: job.backgroundColor,
        };
      });

      // Add regular events if they're active in their associated calendars
      if (activeCalendars[job.calendarName]) {
        acc = acc.concat(expandedEvents);
      }

      // Conditionally add shipping events based on shipping calendar's status
      if (job.shippingDate) {
        if (isShippingActive || activeCalendars[job.calendarName]) {
          acc.push({
            jobID: job.jobID,
            title: `${job.title}: Shipping`,
            date: job.shippingDate,
            backgroundColor: job.backgroundColor,
          });
        }
      }

      return acc;
    }, []);

    // Set the filtered events
    setFilteredEvents(regularEvents);

  }, [myJobs, activeCalendars]);

  //////////////////////////////  HANDLE DATE CLICKED  //////////////////////////////
  const formatDateToView = (dateStr: string): string => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
          throw new Error('Invalid date string');
      }
      date.setDate(date.getDate() + 1);
      const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
  };


  //////////////////////////////  HANDLE DATE CLICKED  //////////////////////////////
  const handleDateClick = (arg:any) => {
    const formattedDate = formatDateToView(arg.dateStr);
    setNewJobSelectedDate(formattedDate)

    openSecondMenu()
  }

  const createNewJob = () => {
    // This is where we will create a new job and post it to the backend, which should trigger a front end refresh of jobs
  }

  //////////////////////////////  HANDLE EVENTS BEING CLICKED  //////////////////////////////
  const handleEventClick = (info: any) => {
    const { event } = info;
    const [titleBeforeColon] = event.title.split(':');
    setMyTitle(titleBeforeColon);
    setMyJobNumber(event.extendedProps.jobID);

    const formattedDate = formatDateToView(event.startStr);
    setMyJobDate(formattedDate);

    openFirstMenu();
  };

  //////////////////////////////  TOGGLE HANDLER  //////////////////////////////
  const handleToggleCalendar = (calendarName: string) => {
    setActiveCalendars(prevState => ({
      ...prevState,
      [calendarName]: !prevState[calendarName],
    }));
  };

  //////////////////////////////  DROP EVENTS  //////////////////////////////
  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const jobId = event.extendedProps.jobID;
    const myStartDate = info.event.startStr;

    const jobToUpdate = myJobs.find((job) => job.jobID === jobId);
    
    if (!jobToUpdate) return;

    // Check if this is a shipping date event
    const isShippingDateEvent = jobToUpdate.shippingDate === info.oldEvent.startStr;

    if (isShippingDateEvent) {
      try {
        // Prevent moving the shipping date on or before any event date
        const invalidShippingDate = jobToUpdate.eventDates.some(
          (eventDate) => new Date(myStartDate) <= new Date(eventDate)
        );

        if (invalidShippingDate) {
          setToastText("Move rejected: Shipping date cannot be on or before any event date.");
          setShowToast(true)
          info.revert();
          return; // Exit early if the move is invalid
        }

        // Update the backend with the new shipping date
        await updateShippingDate(jobId, myStartDate);

        // Update only the shipping date for the job in the frontend
        setMyJobs((prevJobs) =>
          prevJobs.map((job) =>
            job.jobID === jobId
              ? { ...job, shippingDate: myStartDate }
              : job
          )
        );

        // console.log(`Updated shipping date for job ${jobId} to ${myStartDate}`);
      } catch (error) {
        console.error('Failed to update shipping date:', error);
        info.revert();
      }
    } else {
      // Existing logic for handling regular event drops
      if (jobToUpdate) {
        const eventDateFound = jobToUpdate.eventDates.includes(myStartDate);
        const firstEventDate = jobToUpdate.eventDates[0];
        
        if (info.oldEvent.startStr !== firstEventDate) {
          if (eventDateFound && new Date(info.oldEvent.startStr) > new Date(myStartDate)) {
            setToastText("Move rejected: Event can not be moved before previous job events.");
            setShowToast(true)
            info.revert();
            return;
          }
          if (new Date(myStartDate) < new Date(firstEventDate)) {
            setToastText("Move rejected: Event can not be moedd before previous job events.");
            setShowToast(true)
            info.revert();
            return;
          }
        }

        // Logic to update event dates and further checks
        setMyJobs((prevJobs) => {
          const newJobs = prevJobs.map((job) => {
            if (job.jobID === jobId) {
              const oldStartDateStr = info.oldEvent.start.toISOString().substring(0, 10);
              const newStart = new Date(event.start);

              const movedDateIndex = job.eventDates.indexOf(oldStartDateStr);

              if (movedDateIndex !== -1) {
                const updatedEventDates = [...job.eventDates];

                const getNextWeekday = (date: Date): Date => {
                  let nextDate = new Date(date);
                  while (nextDate.getDay() === 6 || nextDate.getDay() === 0) {
                    nextDate.setDate(nextDate.getDate() + 1);
                  }
                  return nextDate;
                };

                let currentDate = getNextWeekday(newStart);

                for (let i = movedDateIndex; i < updatedEventDates.length; i++) {
                  updatedEventDates[i] = currentDate.toISOString().substring(0, 10);
                  currentDate.setDate(currentDate.getDate() + 1);
                  currentDate = getNextWeekday(currentDate);
                }
                
                const shippingDate = new Date(job.shippingDate);
                const invalidAfterMove = updatedEventDates.some(
                  (eventDate) => new Date(eventDate) >= shippingDate
                );

                if (invalidAfterMove) {
                  setToastText("Move rejected: Updated event dates would be on or after the shipping date.");
                  setShowToast(true)
                  info.revert();
                  return job; // Return early if move should be rejected
                }
                
                updateJobEventDatesByNumberID(jobId, updatedEventDates);

                return {
                  ...job,
                  eventDates: updatedEventDates,
                };
              }
            }
            return job;
          });
          return newJobs;
        });
      }
    }
  };

  //////////////////////////////  HELPER FUNCTION FOR BACKEND WRITING  //////////////////////////////
  //////////////////////////////  Not sure I need this anymore, as it's been refactored elsewhere  //////////////////////////////
  // const updateEventsFromJobs = (jobs: Job[]) => {
  //   const updatedEvents = jobs.reduce<CalendarEvent[]>((acc, job) => {
  //     let remainingHours = job.hours; // Initialize with total job hours

  //     // Map regular job dates into events
  //     const expandedEvents = job.eventDates.map((date, index) => {
  //       const eventHour = job.eventHours[index];

  //       // Use the minimum of eventHour or remainingHours for display title and calculation
  //       const applicableHours = Math.min(eventHour, remainingHours);
  //       const eventTitle = `${job.title} : ${applicableHours} / ${remainingHours}`;

  //       // Adjust remainingHours only if it is more than or equal to applicableHours
  //       if (remainingHours >= applicableHours) { remainingHours -= applicableHours; }

  //       return {
  //         jobID: job.jobID,
  //         title: eventTitle,
  //         date,
  //         backgroundColor: job.backgroundColor,
  //       };
  //     });

  //     // Add a special event for shipping date
  //     if (job.shippingDate) {
  //       expandedEvents.push({
  //         jobID: job.jobID,
  //         title: `${job.title}: Shipping Date`,
  //         date: job.shippingDate,
  //         backgroundColor: job.backgroundColor, // A distinct color for shipping events
  //       });
  //     }

  //     return acc.concat(expandedEvents);
  //   }, []);

  //   setEvents(updatedEvents);
  // };

  //////////////////////////////  RESIZE EVENTS  //////////////////////////////
  const handleEventResize = (info: any) => {
    const { event } = info;
    const jobID = event.extendedProps.jobID;
    const job = myJobs.find(j => j.jobID === jobID);
    const isLastEvent = job?.eventDates[job.eventDates.length - 1] === event.startStr;

    if (job) {
      if (!isLastEvent) { info.revert(); return; }; // If not the last event, prevent resizing
      
      // Ensure resizing does not go onto or beyond the shipping date
      if (event.start && event.end) {
        const shippingDate = new Date(job.shippingDate);
        shippingDate.setDate(shippingDate.getDate() + 1);
        if (event.end >= shippingDate) {
          setToastText("Resize rejected: Resizing would extend onto or beyond the shipping date.");
          setShowToast(true)
          info.revert(); return;
        };
    
        const differenceInTime = event.end.getTime() - event.start.getTime();
        const totalDays = Math.floor(differenceInTime / (1000 * 3600 * 24));
    
        const newEvents: CalendarEvent[] = [];
        for (let i = 0; i < totalDays; i++) {
          const newDate = new Date(event.start);
          newDate.setDate(event.start.getDate() + i);
    
          const dayOfWeek = newDate.getDay();
          if (dayOfWeek === 6 || dayOfWeek === 0) { continue; }; // Skip weekends 
    
          newEvents.push({
            jobID: event.extendedProps.jobID,
            title: event.title,
            date: newDate.toISOString().substring(0, 10),
            backgroundColor: event.backgroundColor,
          });
        };
    
        setMyJobs(prevJobs => {
          const newJobs = prevJobs.map(job => {
            if (job.jobID === event.extendedProps.jobID) {
              const newDates = newEvents.map(ev => ev.date);
              const updatedEventDates = [...new Set([...job.eventDates, ...newDates])];
    
              // Update the Firestore document
              updateJobEventDatesByNumberID(job.jobID, updatedEventDates);
    
              return {
                ...job,
                eventDates: updatedEventDates,
              };
            };
            return job;
          });
          return newJobs;
        });
    
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          event.remove();
          newEvents.forEach(newEvent => calendarApi.addEvent(newEvent));
        };
      };
    };
  };

  //////////////////////////////  DELETE EVENT  //////////////////////////////
  const renderDeleteEventButton = (eventInfo: any) => {
    const myJobID = eventInfo.event.extendedProps.jobID;
    const myEventDate = eventInfo.event.startStr;
    const job = myJobs.find(j => j.jobID === myJobID);
    const isLastEvent = job?.eventDates[job.eventDates.length - 1] === myEventDate;

    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span>{eventInfo.event.title}</span>
        {isLastEvent && (
          <button className='deleteButton'
            onClick={(e) => {
              e.stopPropagation(); // Prevent event click from also triggering
              handleDeleteEvent(eventInfo.event);
            }}
          > X </button>
        )}
      </div>
    );
  };

  const [showAlert, setShowAlert] = useState(false);
  const [selectedEventID, setSelectedEventID] = useState<number | null>(null);

  const handleDeleteEvent = (event: any) => {
    setSelectedEventID(event.extendedProps.jobID);
    setShowAlert(true);
  };

  const confirmDelete = () => {
    if (selectedEventID !== null) {
      deleteLastEventByJobID(selectedEventID);
      setSelectedEventID(null); // Clear selected event ID after deletion
    }
    setShowAlert(false);
  };

  //////////////////////////////  SIDE MENUS  //////////////////////////////
  async function openFirstMenu() { await menuController.open('selectedJobMenu'); }
  async function openSecondMenu() { await menuController.open('newJobMenu'); }
  // async function openEndMenu() { await menuController.open('end'); }


  //////////////////////////////  TESTING BUTTON  //////////////////////////////
  // const handleTest = () => {
  //   if (user && user.email) {
  //     // editSiteInfoDocument(user.email, 'feildToChange', 'newValue')
  //     // updateArrayElement(user.email, 'arrayName', (IndexNumber to change, 9999 to add), 'newValue')
  //     // removeArrayElement(user.email, 'arrayName', 'valueToRemove')
  //   }
  // }
  const [isShippingDateOpen, setIsShippingDateOpen] = useState<boolean>(false);
  const [isInHandDateOpen, setIsInHandDateOpen] = useState<boolean>(false);
  
  const handleShippingDateChange = (e: CustomEvent) => {
    setNewJobShippingDate(e.detail.value!);
    setIsShippingDateOpen(false);
  };

  const handleInHandDateChange = (e: CustomEvent) => {
    setNewJobInHandDate(e.detail.value!);
    setIsInHandDateOpen(false);
  };

  return (
    <>
      <IonMenu menuId="selectedJobMenu" contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>{myJobDate}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div>{myTitle}</div>
          <div>
            {myJobNumber}
          </div>
        </IonContent>
      </IonMenu>

      <IonMenu menuId="newJobMenu" contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>{newJobSelectedDate}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonLabel>Job Options</IonLabel>
          <IonItem>
            <IonLabel slot="start">Title</IonLabel>
            <IonInput
              value={newJobTitle}
              placeholder="Title"
              onIonChange={e => setNewJobTitle(e.detail.value!)}
            />
          </IonItem>

          <IonItem>
            <IonLabel slot="start">Total Hours</IonLabel>
            <IonInput
              type="number"
              value={newJobTotalHours}
              onIonChange={e => setNewJobTotalHours(parseFloat(e.detail.value!))}
            />
          </IonItem>

          <IonItem>
            <IonLabel slot="start">PerDay</IonLabel>
            <IonInput
              type="number"
              value={newJobPerDayHours}
              onIonChange={e => setNewJobPerDayHours(parseFloat(e.detail.value!))}
            />
          </IonItem>

          <IonItem>
            <IonLabel>Job Scheduled</IonLabel>
            <IonToggle
          slot="end"
              checked={newJobScheduled}
              onIonChange={e => setNewJobScheduled(e.detail.checked)}
            />
          </IonItem>

          <IonItem>
            <IonLabel>Shipping Date</IonLabel>
            <IonToggle
              slot="end"
              checked={showShippingCalendar}
              onIonChange={e => setShowShippingCalendar(e.detail.checked)}
            />
          </IonItem>

          {showShippingCalendar && (
            <IonItem>
              <IonDatetimeButton slot="end" datetime="shipping-datetime" onClick={() => setIsShippingDateOpen(true)}></IonDatetimeButton>

              <IonModal
                isOpen={isShippingDateOpen}
                onDidDismiss={() => setIsShippingDateOpen(false)}
                keepContentsMounted={true}
              >
                <IonDatetime
                  id="shipping-datetime"
                  presentation="date"
                  value={newJobShippingDate}
                  onIonChange={handleShippingDateChange}
                />
              </IonModal>
            </IonItem>
          )}

          <IonItem>
            <IonLabel>InHand Date</IonLabel>
            <IonToggle
              slot="end"
              checked={showInHandCalendar}
              onIonChange={e => setShowInHandCalendar(e.detail.checked)}
            />
          </IonItem>

          {showInHandCalendar && (
            <IonItem>
              <IonLabel></IonLabel>
              <IonDatetimeButton datetime="inhand-datetime" onClick={() => setIsInHandDateOpen(true)}></IonDatetimeButton>

              <IonModal
                isOpen={isInHandDateOpen}
                onDidDismiss={() => setIsInHandDateOpen(false)}
                keepContentsMounted={true}
              >
                <IonDatetime
                  id="inhand-datetime"
                  presentation="date"
                  value={newJobInHandDate}
                  onIonChange={handleInHandDateChange}
                />
              </IonModal>
            </IonItem> 
          )}
          <div className='menuPadding'></div>

          <IonLabel>Calendar Options</IonLabel>
          <IonItem>
            <IonLabel>Calendar Name</IonLabel>
            <IonSelect
              slot="end"
              value={newJobCalendar}
              placeholder="Select"
              onIonChange={e => setNewJobCalendar(e.detail.value)}
              interface="popover" // Use popover for immediate selection
            >
              {calendarNames.map(name => (
                <IonSelectOption key={name} value={name}>
                  {name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel>Calendar Color</IonLabel>
            <IonSelect
              slot="end"
              value={newJobColor}
              placeholder="Select"
              onIonChange={e => setNewJobColor(e.detail.value)}
              interface="popover" // Use popover for immediate selection
            >
              {calendarColors.map(color => (
                <IonSelectOption key={color} value={color}>
                  {color}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel>Calculate From End Date</IonLabel>
            <IonToggle
              slot="end"
              checked={newJobEndDate}
              onIonChange={e => setNewJobEndDate(e.detail.checked)}
            />
          </IonItem>
          
        </IonContent>
      </IonMenu>


      {/* <IonMenu side="end" contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>End Menu</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">This is the end menu content.</IonContent>
      </IonMenu> */}

      <IonPage id="main-content" className='mainContent'>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton></IonBackButton>
            </IonButtons>
              <IonTitle>Reliable Calendar</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleLogout}>Logout</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          {/* <IonButton expand="block" onClick={openFirstMenu}>
            Open First Menu
          </IonButton>
          <IonButton expand="block" onClick={openSecondMenu}>
            Open Second Menu
          </IonButton>
          <IonButton expand="block" onClick={openEndMenu}>
            Open End Menu
          </IonButton> */}
          <div className='mainPageHolder'>
            <div className='frank'>
              {/* Render Toggle buttons */}
              {calendarNames.map((name) => (
                <IonItem key={name}>
                  <IonLabel>{name}</IonLabel>
                  <IonToggle
                    checked={activeCalendars[name]}
                    onIonChange={() => handleToggleCalendar(name)}
                  />
              {name !== "main" && name !== 'shipping' && ( // Conditionally render the delete button
                <IonButton 
                  color="danger"
                  slot="end"
                  onClick={() => handleDeleteCalendar(name)}
                >
                  X
                </IonButton>
              )}
                </IonItem>
              ))}
              <IonItem>
                <IonInput
                  value={newCalendarName}
                  placeholder="Enter new calendar name"
                  onIonChange={(e) => setNewCalendarName(e.detail.value!)}
                />
                <IonButton color="success" onClick={handleAddCalendar}>+</IonButton>
              </IonItem>
              <IonButton onClick={refreshButtonClicked}>
                <IonIcon icon={refreshOutline} slot="icon-only" />
              </IonButton>
            </div>
            <div className='calendarHolder'>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialDate="2025-07-01"
                initialView="dayGridYear"
                height="87vh"
                editable={true}
                events={filteredEvents}
                customButtons={{
                  myTodayButton: {
                    text: 'Today',
                    click: handleTodayButtonClick,
                  }
                }}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridYear,dayGridMonth,dayGridWeek,dayGridDay,myTodayButton'
                }}
                eventDrop={handleEventDrop}
                eventClick={handleEventClick}
                eventResize={handleEventResize}
                eventContent={renderDeleteEventButton}
                dateClick={handleDateClick}
                />
            </div>
            
          </div>

          <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={'Confirm Delete'}
          message={'Are you sure you want to delete this event?'}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                setShowAlert(false);
              },
            },
            {
              text: 'Delete',
              handler: confirmDelete,
            },
          ]}
          />

          <IonAlert
            isOpen={showDeleteAlert}
            onDidDismiss={() => setShowDeleteAlert(false)}
            header={"Confirm Delete"}
            message={`Are you sure you want to delete the calendar "${calendarNameToDelete}"?`}
            buttons={[
              {
                text: "Cancel",
                role: "cancel",
                handler: cancelDeleteCalendar,
              },
              {
                text: "Delete",
                handler: confirmDeleteCalendar,
              },
            ]}
          />
        </IonContent>

        <IonToast
          isOpen={showToast}
          message={toastText}
          duration={3000}
          onDidDismiss={() => setShowToast(false)} // Reset the toast visibility
        />
        <IonFooter>
          <IonToolbar>
            <IonTitle size="small">© 2025 Dancing Goat Studios</IonTitle>
          </IonToolbar>
        </IonFooter>
      </IonPage>
    </>
  );
};

export default Calendar;
